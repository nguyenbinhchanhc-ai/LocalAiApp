import axios from 'axios';
import * as cheerio from 'cheerio';

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

    const $ = cheerio.load(response.data);
    let results = "";
    
    // Lấy top 3 kết quả từ DuckDuckGo Lite
    $('.result-snippet').each((i, element) => {
      if (i < 3) {
        results += $(element).text().trim() + "\n";
      }
    });

    if (!results) {
      return "Không tìm thấy thông tin trên mạng.";
    }

    return results;
  } catch (error) {
    console.error("Lỗi khi tìm kiếm web:", error);
    return "Lỗi khi truy cập internet.";
  }
}
