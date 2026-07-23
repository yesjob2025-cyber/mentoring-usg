// 질문 작성자 표시 이름.
//  - isPublic(=이름 공개) true 이면 실명, false 이면 "익명"
//  - 관리자(admin/superadmin)는 항상 실명 확인 가능
export function displayAuthor(
  q: { authorName: string; isPublic: boolean },
  isAdmin = false
): string {
  if (isAdmin) return q.isPublic ? q.authorName : `${q.authorName} (익명)`;
  return q.isPublic ? q.authorName : "익명";
}
