export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { serviceKey, action, ...rest } = req.query;
    if (!serviceKey) return res.status(400).json({ error: 'serviceKey 없음' });

    // action에 따라 엔드포인트 선택
    const ENDPOINTS = {
      search: 'https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttList02',
      detail: 'https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeInfo02',
    };

    const BASE = ENDPOINTS[action] || ENDPOINTS.search;
    const qs = Object.entries(rest)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const url = `${BASE}?serviceKey=${serviceKey}&${qs}`;
    console.log('URL:', url);

    const response = await fetch(url);
    const xml = await response.text();
    console.log('XML preview:', xml.substring(0, 300));

    // 에러 체크
    const resultCode = xml.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1]?.trim() || '';
    const resultMsg = xml.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1]?.trim() || '';
    const totalCount = xml.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] || '0';

    if (resultCode && resultCode !== '00' && resultCode !== 'INFO-000') {
      return res.status(200).json({ error: resultMsg, resultCode });
    }

    // item 파싱
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const x = match[1];
      const get = (tag) => x.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))?.[1]?.trim() || '';
      items.push({
        instNm: get('instNm'),           // 기관명
        addr: get('addr'),               // 주소
        telno: get('telno'),             // 전화번호
        longTermCareInsttNo: get('longTermCareInsttNo'), // 기관번호
        instTypNm: get('instTypNm'),     // 기관유형명
        bnfchrCo: get('bnfchrCo'),       // 수급자 수
        totCo: get('totCo'),             // 정원
        sigunCdNm: get('sigunCdNm'),     // 시군구명
        sidoCdNm: get('sidoCdNm'),       // 시도명
        evalGrd: get('evalGrd'),         // 평가등급
        estbsDt: get('estbsDt'),         // 설립일
        homepage: get('homepage'),       // 홈페이지
      });
    }

    return res.status(200).json({
      response: {
        header: { resultCode, resultMsg },
        body: { totalCount: parseInt(totalCount), items: { item: items } }
      }
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
