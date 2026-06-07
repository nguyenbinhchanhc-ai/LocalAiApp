import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system';

export class LlmService {
  private context: LlamaContext | null = null;
  public isReady = false;

  // Cấu hình URL Model. Chúng ta dùng Phi-3.5-mini GGUF (4-bit) làm mặc định cho nhẹ, hoặc Llama-3.2-3B.
  private MODEL_URL = "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf";
  private MODEL_FILENAME = "phi-3.5-mini-q4.gguf";
  private localModelPath = `${FileSystem.documentDirectory}${this.MODEL_FILENAME}`;

  async downloadModel(onProgress?: (progress: number) => void) {
    const fileInfo = await FileSystem.getInfoAsync(this.localModelPath);
    if (fileInfo.exists) {
      console.log("Model đã có sẵn tại:", this.localModelPath);
      return this.localModelPath;
    }

    console.log("Bắt đầu tải model...");
    const downloadResumable = FileSystem.createDownloadResumable(
      this.MODEL_URL,
      this.localModelPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(progress);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      console.log('Tải model xong:', result?.uri);
      return result?.uri;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async loadModel() {
    const fileInfo = await FileSystem.getInfoAsync(this.localModelPath);
    if (!fileInfo.exists) {
      throw new Error("Model chưa được tải xuống!");
    }

    try {
      this.context = await initLlama({
        model: this.localModelPath,
        use_mlock: true, // Giữ model trong RAM
        n_ctx: 2048, // Context window (giảm để tiết kiệm RAM)
        n_gpu_layers: 50, // Sử dụng Metal GPU của Apple
      });
      this.isReady = true;
      console.log("Model load thành công!");
    } catch (error) {
      console.error("Lỗi khi load model:", error);
      throw error;
    }
  }

  async *generateStream(prompt: string) {
    if (!this.context) throw new Error("Context chưa khởi tạo");
    
    // Prompt format cho Phi-3/Llama-3
    const formattedPrompt = `<|system|>Bạn là một trợ lý AI thông minh trên điện thoại. Hãy trả lời ngắn gọn và chính xác.<|end|><|user|>${prompt}<|end|><|assistant|>`;

    try {
      let isDone = false;
      let textStream = "";
      
      const completion = await this.context.completion(
        {
          prompt: formattedPrompt,
          n_predict: 512,
          temperature: 0.7,
        },
        (data) => {
          // Streaming callback
          const text = data.token;
          textStream += text;
        }
      );
      
      yield completion.text;
    } catch (error) {
      console.error("Lỗi khi sinh text:", error);
      throw error;
    }
  }

  async release() {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.isReady = false;
    }
  }
}

export const llmService = new LlmService();
