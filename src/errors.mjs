export class SearchError extends Error { constructor(code,message) {super(message);this.code=code;} }
export const messages={
  LOAD:'네이버 통합검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
  BLOCKED:'네이버에서 접속 확인을 요청하거나 검색 접근을 제한했습니다. 잠시 후 다시 시도해주세요.',
  STRUCTURE:'네이버 검색 화면 구조가 달라져 전체 결과의 순서를 정확히 읽지 못했습니다. 순위를 표시하지 않았습니다.',
  NAME:'블로그 결과 중 이름을 읽지 못한 항목이 있어 정확한 순위를 확인할 수 없습니다.',
  RANGE:'요청한 범위까지 검색 결과를 읽지 못했습니다. 더 작은 검색 범위를 선택해주세요.',
};
