import cv2
import mediapipe as mp
import numpy as np
from sklearn.linear_model import LinearRegression

# use mediapipe face mesh to get 3d facial landmarks, including iris and eye shape
detector = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)

# landmark indices for left and right eyes and irises
# we use corner points, top/bottom eyelids, and iris centers for both eyes
EYE_L = [33, 133]
EYE_R = [362, 263]
TOP_L, BOTTOM_L = 159, 145
TOP_R, BOTTOM_R = 386, 374
IRIS_L, IRIS_R = 468, 473

# screen dimensions (used to scale the gaze output to fit full screen)
w, h = 1360, 768
cv2.namedWindow("Gaze", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Gaze", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
cap = cv2.VideoCapture(1)  # use webcam id 1 (might need to change to 0 on other system)

# calibration data
# X = iris features (normalized), y = actual screen positions (where user looked)
X, y = [], []
model = LinearRegression()
calibrated = False
cal_idx = 0

# list of calibration targets the user looks at during setup
# these are 9 points spread out across the screen
dots = [
    (50, 50), (w//2, 50), (w-50, 50),
    (50, h//2), (w//2, h//2), (w-50, h//2),
    (50, h-50), (w//2, h-50), (w-50, h-50)
]

# smoothed gaze dot position, alpha is the smoothing factor
sx, sy = w//2, h//2
alpha = 0.2

# extract normalized iris position relative to eye shape (left or right)
def get_iris(face, eye, top, bottom, iris_idx, fw, fh):
    x1 = face[eye[0]].x * fw
    x2 = face[eye[1]].x * fw
    y1 = face[top].y * fh
    y2 = face[bottom].y * fh
    ix = face[iris_idx].x * fw
    iy = face[iris_idx].y * fh
    norm_x = (ix - min(x1, x2)) / (abs(x1 - x2) + 1e-6)
    norm_y = (iy - min(y1, y2)) / (abs(y1 - y2) + 1e-6)
    return [norm_x, norm_y]

# main loop
while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break
    frame = cv2.flip(frame, 1)  # flip horizontally for mirror view
    fh, fw = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = detector.process(rgb)
    canvas = np.zeros((h, w, 3), dtype=np.uint8)  # blank screen for visualization

    if res.multi_face_landmarks:
        face = res.multi_face_landmarks[0].landmark
        iris_l = get_iris(face, EYE_L, TOP_L, BOTTOM_L, IRIS_L, fw, fh)
        iris_r = get_iris(face, EYE_R, TOP_R, BOTTOM_R, IRIS_R, fw, fh)

        # average of both eyes
        iris = [(iris_l[0] + iris_r[0]) / 2, (iris_l[1] + iris_r[1]) / 2]

        if not calibrated and cal_idx < len(dots):
            # during calibration: show green dot and wait for space key
            cx, cy = dots[cal_idx]
            cv2.circle(canvas, (cx, cy), 20, (0,255,0), -1)
            cv2.putText(canvas, f"dot {cal_idx+1}/{len(dots)} - space to save", (50, 100), 0, 1, (255,255,255), 2)

        elif calibrated:
            # after calibration: predict gaze from iris feature
            px, py = model.predict([iris])[0]
            px = int(np.clip(px, 0, w))
            py = int(np.clip(py, 0, h))
            sx = (1-alpha)*sx + alpha*px
            sy = (1-alpha)*sy + alpha*py
            cv2.circle(canvas, (int(sx), int(sy)), 15, (0,255,255), -1)

    cv2.imshow("Gaze", canvas)
    k = cv2.waitKey(1)
    if k == 27: break  # esc key to quit
    elif k == 32 and not calibrated and res.multi_face_landmarks:
        # space key to save calibration sample
        X.append(iris)
        y.append(dots[cal_idx])
        cal_idx += 1
        if cal_idx >= len(dots):
            model.fit(X, y)
            calibrated = True
            print("✅ done calibrating")

cap.release()
cv2.destroyAllWindows()
