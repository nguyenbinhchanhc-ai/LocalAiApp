import { llmService } from './llm';
import { searchWeb } from './tools/webSearch';
import * as FileSystem from 'expo-file-system';

export class AgentService {
  async processQuery(query: string, fileUri?: string): Promise<string> {
    let context = "";

    // 1. Xử lý File nếu có đính kèm
    if (fileUri) {
      try {
        console.log("Đang đọc file:", fileUri);
        const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        // Trích xuất 1 phần nội dung để tránh tràn RAM
        context += `\n[Nội dung File đính kèm]:\n${fileContent.substring(0, 1500)}\n`;
      } catch (e) {
        console.error("Lỗi đọc file:", e);
      }
    }

    // 2. Quyết định xem có cần tìm kiếm Web hay không (Heuristic đơn giản kết hợp)
    const needsWebSearch = /tìm kiếm|hôm nay|thời tiết|hiện tại|mới nhất|tin tức|giá vàng/i.test(query);
    if (needsWebSearch) {
      const searchResults = await searchWeb(query);
      context += `\n[Kết quả tìm kiếm Internet]:\n${searchResults}\n`;
    }

    // 3. Xây dựng Prompt cuối cùng
    let finalPrompt = query;
    if (context.length > 0) {
      finalPrompt = `Dựa vào thông tin sau đây:\n${context}\n\nHãy trả lời câu hỏi: ${query}`;
    }

    // 4. Sinh câu trả lời (Gắn stream generator vào state để UI lấy dữ liệu)
    // Để đơn giản trả về một string, trên UI có thể thay đổi để gọi stream
    let result = "";
    const stream = llmService.generateStream(finalPrompt);
    
    // Thu thập kết quả từ generator
    for await (const chunk of stream) {
       result += chunk;
    }
    
    return result;
  }
}

export const agentService = new AgentService();
