export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return new Response('No Google Drive file ID provided', { status: 400 });
  }

  try {
    const driveUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    
    // Fetch the file from Google Drive (Edge runtime automatically follows 303 redirects)
    const response = await fetch(driveUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Create a new response to modify headers and strip the security blocks
    const newHeaders = new Headers(response.headers);
    newHeaders.delete('cross-origin-resource-policy');
    newHeaders.delete('cross-origin-embedder-policy');
    newHeaders.delete('cross-origin-opener-policy');
    newHeaders.set('access-control-allow-origin', '*');

    // Return the passthrough stream back to the client!
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (error) {
    console.error('Edge Proxy Error:', error);
    return new Response('Proxy Error', { status: 500 });
  }
}
