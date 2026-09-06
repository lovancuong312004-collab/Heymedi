import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
// Make sure to add VITE_GEMINI_API_KEY to your .env file
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "dummy_key_for_build");

/**
 * Helper to convert a File to a Generative Part object
 */
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type
    },
  };
}

export interface ParsedMedication {
  name: string;
  dosage: string;
  time: string;
  instructions: string;
}

/**
 * Analyzes a prescription image and returns a list of medications
 */
export async function analyzePrescription(imageFile: File): Promise<ParsedMedication[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Bạn là một trợ lý y tế thông minh. Hãy đọc ảnh đơn thuốc hoặc vỏ hộp thuốc được cung cấp.
Trích xuất danh sách tất cả các loại thuốc và trả về DƯỚI DẠNG CHUỖI JSON ARRAY MÀ KHÔNG CÓ BẤT KỲ VĂN BẢN NÀO KHÁC (không dùng markdown code blocks, chỉ JSON thuần túy).

Định dạng JSON yêu cầu:
[
  {
    "name": "Tên thuốc",
    "dosage": "Liều lượng (VD: 1 viên, 5ml)",
    "time": "Sáng, Trưa, Tối, hoặc Trước ngủ",
    "instructions": "Cách dùng (VD: Uống sau ăn)"
  }
]

Nếu không tìm thấy thuốc nào, hãy trả về []. Chỉ trả về mảng JSON.
    `.trim();

    const imagePart = await fileToGenerativePart(imageFile);

    const result = await model.generateContent([prompt, imagePart as any]);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown formatting from Gemini response
    if (text.startsWith('\`\`\`json')) {
      text = text.replace('\`\`\`json', '').replace('\`\`\`', '').trim();
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace('\`\`\`', '').replace('\`\`\`', '').trim();
    }

    const jsonResult = JSON.parse(text);
    return Array.isArray(jsonResult) ? jsonResult : [];
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Không thể phân tích ảnh đơn thuốc. Vui lòng thử lại.");
  }
}
