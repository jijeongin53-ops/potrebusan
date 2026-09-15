module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const host = `https://${req.headers.host}`;
    
    // Fallback to fetch sheet.json
    let count = 0;
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${host}/sheet.json`);
      if (response.ok) {
        const data = await response.json();
        count = Array.isArray(data) ? data.length : 0;
      }
    } catch(e) {
      // ignore
    }

    res.status(200).json({
      metricName: "오디오 파일 수",
      value: count
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to read data" });
  }
};
