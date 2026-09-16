export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || url.searchParams.get('isbn') || url.searchParams.get('q');
  
  if (!code) {
    return new Response(JSON.stringify({ error: 'No ISBN code provided' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }

  const cleanCode = code.replace(/[^0-9X]/gi, '');
  if (!cleanCode || cleanCode.length < 8) {
    return new Response(JSON.stringify({ title: null }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }

  try {
    let title = null;

    // 1. Aladin Web Search
    try {
      const aladinRes = await fetch(`https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Book&SearchWord=${cleanCode}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (aladinRes.ok) {
        const html = await aladinRes.text();
        const match = html.match(/<a href="[^"]*wproduct\.aspx[^"]*" class="bo3"><b>(.*?)<\/b><\/a>/) ||
                      html.match(/class="bo3"[^>]*><b>(.*?)<\/b>/);
        if (match && match[1]) {
          const clean = match[1].replace(/<[^>]+>/g, '').trim();
          if (clean && clean !== '목차에서 검색') {
            title = clean;
          }
        }
      }
    } catch (e) {
      console.warn('Aladin search error:', e);
    }

    // 2. Naver Book Search (if Aladin didn't find)
    if (!title) {
      try {
        const naverRes = await fetch(`https://search.shopping.naver.com/book/search?query=${cleanCode}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (naverRes.ok) {
          const html = await naverRes.text();
          const match = html.match(/"bookTitle":"([^"]+)"/) || html.match(/"title":"([^"]+)"/);
          if (match && match[1] && match[1] !== '네이버쇼핑') {
            title = match[1];
          }
        }
      } catch (e) {
        console.warn('Naver search error:', e);
      }
    }

    // 3. Daum Book Search (if Naver didn't find)
    if (!title) {
      try {
        const daumRes = await fetch(`https://search.daum.net/search?w=book&q=${cleanCode}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (daumRes.ok) {
          const html = await daumRes.text();
          const match = html.match(/class="tit_main[^"]*"[^>]*>(.*?)<\/a>/s);
          if (match && match[1]) {
            const clean = match[1].replace(/<[^>]+>/g, '').trim();
            if (clean) title = clean;
          }
        }
      } catch (e) {
        console.warn('Daum search error:', e);
      }
    }

    // 4. OpenLibrary (if previous didn't find)
    if (!title) {
      try {
        const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&format=json&jscmd=data`);
        if (olRes.ok) {
          const data = await olRes.json();
          const key = `ISBN:${cleanCode}`;
          if (data[key] && data[key].title) {
            title = data[key].title;
          }
        }
      } catch (e) {
        console.warn('OpenLibrary error:', e);
      }
    }

    // 5. Google Books API (Fallback)
    if (!title) {
      try {
        const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}`);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.items && gData.items.length > 0) {
            title = gData.items[0].volumeInfo?.title || null;
          }
        }
      } catch (e) {
        console.warn('Google Books error:', e);
      }
    }

    return new Response(JSON.stringify({ code: cleanCode, title: title }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      }
    });

  } catch (error) {
    console.error('ISBN Resolver Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
}
