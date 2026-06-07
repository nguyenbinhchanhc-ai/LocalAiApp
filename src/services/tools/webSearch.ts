import axios from 'axios';

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ''); // Strip any nested HTML tags
}

export async function searchWeb(query: string): Promise<string> {
  try {
    console.log(`Đang tìm kiếm web cho: "${query}"`);
    
    // Sử dụng DuckDuckGo Lite cho dễ parse HTML và không cần API Key
    const response = await axios.get(`https://lite.duckduckgo.com/lite/`, {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      }
    });

    const html = response.data;
    let results: string[] = [];
    
    // Match class="result-snippet" (can be in any tag like td)
    const snippetRegex = /class=["']result-snippet["'][^>]*>([\s\S]*?)<\//gi;
    let match;
    let count = 0;
    
    while ((match = snippetRegex.exec(html)) !== null && count < 3) {
      const rawText = match[1];
      const cleanText = decodeHTMLEntities(rawText).trim();
      if (cleanText) {
        results.push(cleanText);
        count++;
      }
    }

    if (results.length === 0) {
      // Thử thêm regex dự phòng nếu DuckDuckGo Lite thay đổi cấu trúc
      const backupRegex = /class=[^>]*result-snippet[^>]*>([\s\S]*?)<\//gi;
      let countBackup = 0;
      while ((match = backupRegex.exec(html)) !== null && countBackup < 3) {
        const rawText = match[1];
        const cleanText = decodeHTMLEntities(rawText).trim();
        if (cleanText && !results.includes(cleanText)) {
          results.push(cleanText);
          countBackup++;
        }
      }
    }

    if (results.length === 0) {
      return "Không tìm thấy thông tin trên mạng.";
    }

    return results.join("\n\n");
  } catch (error) {
    console.error("Lỗi khi tìm kiếm web:", error);
    return "Lỗi khi truy cập internet.";
  }
}
