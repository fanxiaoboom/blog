export const siteConfig = {
  name: 'BooMoo Space',
  owner: 'Bran',
  title: 'BooMoo Space | 产品经理、体验设计师、细节控',
  description:
    '我是 Bran，一名关注产品、体验设计和技术实践的创作者。在 BooMoo Space 记录项目、学习、生活与思考。',
  url:
    process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://boomoo.space')
      : 'http://localhost:3000',
  locale: 'zh_CN',
  language: 'zh-CN',
  keywords: ['BooMoo Space', 'Bran', '产品经理', '体验设计', '技术博客'],
  email: 'fanxiaoboom@163.com',
  social: {
    github: 'https://github.com/fanxiaoboom',
  },
}
