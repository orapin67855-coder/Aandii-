/** จุดเริ่มต้นสำหรับตรวจสอบและวางแผนคลังข้อสอบ — ไม่ใช่การรับรองว่านำเนื้อหาไปเผยแพร่ได้
 *  ต้องบันทึกหลักฐานสิทธิ์รายแหล่งก่อนเผยแพร่ (ดู QUESTION_SOURCES.md) */
export type Source = { name: string; desc: string; url: string };
export const SOURCES: Source[] = [
  { name: "myTCAS — ข้อสอบพร้อมเฉลย", desc: "คลังข้อสอบและเฉลย", url: "https://mytcas.com/answers" },
  { name: "myTCAS — โครงสร้างและตัวอย่างข้อสอบ", desc: "Blueprint ข้อสอบ", url: "https://mytcas.com/blueprint" },
  { name: "สทศ. — ข้อสอบ O-NET", desc: "ข้อสอบ O-NET", url: "https://niets.or.th/th/catalog/view/630" },
  { name: "สทศ. — ระบบดาวน์โหลดข้อสอบ", desc: "ดาวน์โหลดข้อสอบ", url: "https://niets.or.th/examdownload" },
  { name: "สสวท. — บริการออนไลน์", desc: "คลังข้อสอบและบริการ", url: "https://ipst.ac.th/e-service-2025" },
  { name: "SciMath", desc: "สื่อวิทย์-คณิตของ สสวท.", url: "https://scimath.org" },
  { name: "Project 14", desc: "โครงการของ สสวท.", url: "https://proj14.ipst.ac.th" },
  { name: "Thai MOOC", desc: "แพลตฟอร์มเรียนออนไลน์", url: "https://thaimooc.ac.th" },
];
