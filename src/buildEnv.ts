export default {
  // @ts-ignore
  buildDate: typeof __buildDate__ === 'undefined' ? '__now__' : __buildDate__,
  // @ts-ignore
  buildVersion: typeof __buildVersion__ === 'undefined' ? '__dev__' : __buildVersion__,
}
