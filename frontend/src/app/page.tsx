import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>placeholder</title>
      </Head>

      <div
        style={{
          width: '100vw',
          height: '40px',
          backgroundColor: 'rgba(30,30,30,0.85)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          fontFamily: 'sans-serif',
          userSelect: 'none',
        }}
      >
        <span style={{ fontWeight: 'bold', marginRight: '16px' }}>placeholder</span>
        <span>placeholder</span>
      </div>
    </>
  );
}
