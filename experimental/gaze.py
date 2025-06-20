import cv2
import mediapipe as mp
import numpy as np
from sklearn.linear_model import RidgeCV
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
import time

# use mediapipe face mesh for 3d facial landmarks, including iris and eye shape
detector = mp.solutions.face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=True)

# landmark indices for left and right eyes and irises
eye_l = [33, 133]
eye_r = [362, 263]
top_l, bottom_l = 159, 145
top_r, bottom_r = 386, 374
iris_l, iris_r = 468, 473

# screen dimensions (used to scale gaze output)
w, h = 1360, 768
cv2.namedWindow("gaze", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("gaze", cv2.WINDOW_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

cap = cv2.VideoCapture(1)

# storage for calibration samples and targets
x_l_samples, y_l_targets = [], []
x_r_samples, y_r_targets = [], []
cal_idx = 0
repeat = 0
calibrated = False

# generates a 5×5 grid of calibration dots
margin = 60
cols = np.linspace(margin, w - margin, 5, dtype=int)
rows = np.linspace(margin, h - margin, 5, dtype=int)
dots = [(x, y) for y in rows for x in cols]

# simple kalman filter to smooth gaze dot
kf = cv2.KalmanFilter(4, 2)
kf.measurementMatrix = np.eye(2, 4, dtype=np.float32)
kf.transitionMatrix = np.array([[1,0,1,0],
                                [0,1,0,1],
                                [0,0,1,0],
                                [0,0,0,1]], np.float32)
kf.processNoiseCov = np.eye(4, dtype=np.float32) * 1e-4
kf.measurementNoiseCov = np.eye(2, dtype=np.float32) * 1e-2
kf.statePost = np.array([[w//2],[h//2],[0],[0]], np.float32)

last_seen = time.time()

# 3d model points for head pose estimation (nose, chin, eyes, mouth)
model_points = np.array([
    (0.0, 0.0, 0.0),
    (0.0, -330.0, -65.0),
    (-225.0, 170.0, -135.0),
    (225.0, 170.0, -135.0),
    (-150.0, -150.0, -125.0),
    (150.0, -150.0, -125.0)
], dtype=np.float64)

def get_head_pitch(face, fw, fh):
    # selecst 2d image points for nose tip, chin, eyes, mouth corners
    image_points = np.array([
        (face[1].x*fw, face[1].y*fh),
        (face[199].x*fw, face[199].y*fh),
        (face[33].x*fw, face[33].y*fh),
        (face[362].x*fw, face[362].y*fh),
        (face[61].x*fw, face[61].y*fh),
        (face[291].x*fw, face[291].y*fh)
    ], dtype=np.float64)

    focal_length = fw
    center = (fw/2, fh/2)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4,1))

    success, rvec, tvec = cv2.solvePnP(
        model_points, image_points, camera_matrix, dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE
    )
    if not success:
        return 0.0

    rot_mat, _ = cv2.Rodrigues(rvec)
    sy = np.sqrt(rot_mat[0,0]**2 + rot_mat[1,0]**2)
    pitch = np.arctan2(-rot_mat[2,0], sy)
    return float(pitch)

def extract_features(face, eye, top, bottom, iris_idx, fw, fh, pitch):
    # computes pixel coords for eye corners, eyelids, iris center
    x1 = face[eye[0]].x*fw
    x2 = face[eye[1]].x*fw
    y1 = face[top].y*fh
    y2 = face[bottom].y*fh
    ix = face[iris_idx].x*fw
    iy = face[iris_idx].y*fh

    # normalize iris position relative to corners and lids
    norm_x = (ix - min(x1, x2)) / (abs(x1 - x2) + 1e-6)
    norm_y = (iy - min(y1, y2)) / (abs(y1 - y2) + 1e-6)

    # eye aspect ratio for blink detection
    ear = abs(y1 - y2) / (abs(x1 - x2) + 1e-6)

    # horizontal iris-to-corner ratio for lateral gaze
    corner_ratio = (ix - x1) / (x2 - x1 + 1e-6)

    # return feature vector including head pitch
    return [norm_x, norm_y, ear, corner_ratio, pitch], ear

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    fh, fw = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = detector.process(rgb)
    canvas = np.zeros((h, w, 3), np.uint8)

    if res.multi_face_landmarks:
        face = res.multi_face_landmarks[0].landmark

        # get head pitch angle for vertical correction
        pitch = get_head_pitch(face, fw, fh)

        f_l, ear_l = extract_features(face, eye_l, top_l, bottom_l, iris_l, fw, fh, pitch)
        f_r, ear_r = extract_features(face, eye_r, top_r, bottom_r, iris_r, fw, fh, pitch)

        # skips if eyes appear closed or bad frame
        if 0.18 < ear_l < 0.38 and 0.18 < ear_r < 0.38:
            if not calibrated:
                cx, cy = dots[cal_idx]
                cv2.circle(canvas, (cx, cy), 25, (0,255,0), -1)
                cv2.putText(canvas,
                            f"{cal_idx+1}/{len(dots)} look at this dot (space to save)",
                            (50,80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
            else:
                # predict gaze per eye and average
                px_l, py_l = model_l.predict([f_l])[0]
                px_r, py_r = model_r.predict([f_r])[0]
                px, py = (px_l + px_r)/2, (py_l + py_r)/2

                # update kalman filter and draw gaze dot
                kf.predict()
                meas = np.array([[np.float32(px)], [np.float32(py)]])
                kf.correct(meas)
                sx, sy = int(kf.statePost[0]), int(kf.statePost[1])
                cv2.circle(canvas, (sx, sy), 18, (0,255,255), -1)
                last_seen = time.time()

    # if face lost, keep last dot for 0.5s
    if calibrated and time.time() - last_seen < 0.5:
        sx, sy = int(kf.statePost[0]), int(kf.statePost[1])
        cv2.circle(canvas, (sx, sy), 18, (0,200,200), 2)

    cv2.imshow("gaze", canvas)
    key = cv2.waitKey(1) & 0xFF

    if key == 27:
        break
    if key == 32 and not calibrated and res.multi_face_landmarks:
        # save three samples per calibration dot
        cx, cy = dots[cal_idx]
        x_l_samples.append(f_l)
        x_r_samples.append(f_r)
        y_l_targets.append((cx, cy))
        y_r_targets.append((cx, cy))
        repeat += 1

        if repeat >= 3:
            repeat = 0
            cal_idx += 1

        # train polynomial ridge models once all dots done
        if cal_idx >= len(dots):
            model_l = make_pipeline(
                PolynomialFeatures(2, include_bias=False),
                RidgeCV(alphas=np.logspace(-3, 3, 13))
            ).fit(x_l_samples, y_l_targets)
            model_r = make_pipeline(
                PolynomialFeatures(2, include_bias=False),
                RidgeCV(alphas=np.logspace(-3, 3, 13))
            ).fit(x_r_samples, y_r_targets)
            calibrated = True
            print("✅ calibration complete, gaze tracking live")

cap.release()
cv2.destroyAllWindows()
