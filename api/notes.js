// 2단계: 가상 메모를 정적 파일이 아니라 학습용 Supabase 테이블에서 서버 쪽으로 읽습니다.
// SUPABASE_URL, SUPABASE_SECRET_KEY는 Vercel 프로젝트 환경변수에서만 읽습니다.
// 서버 전용 키는 이 함수 안에서만 쓰고 응답·로그·브라우저 파일에 넣지 않습니다.
// 남은 약점: 3단계 전까지 이 주소(/api/notes)는 로그인 없이 누구나 부를 수 있습니다.

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('notes: SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 없습니다.');
    return response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
  }

  try {
    const endpoint = new URL('/rest/v1/notes', url);
    endpoint.searchParams.set('select', 'title,content');
    endpoint.searchParams.set('order', 'id.asc');

    const upstream = await fetch(endpoint, {
      headers: { apikey: key, Accept: 'application/json' },
    });
    if (!upstream.ok) {
      // 상태 코드만 남기고 키나 요청 헤더는 기록하지 않습니다.
      console.error(`notes: Supabase 응답 상태 ${upstream.status}`);
      return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
    }

    const rows = await upstream.json();
    const notes = Array.isArray(rows)
      ? rows.map(({ title, content }) => ({ title, content }))
      : [];
    return response.status(200).json({ notes });
  } catch {
    console.error('notes: Supabase 요청 중 오류가 났습니다.');
    return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
  }
}
