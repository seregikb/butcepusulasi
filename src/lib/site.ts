export const SITE = {
  name: 'Bütçe Pusulası',
  domain: 'butcepusulasi.com',
  url: 'https://butcepusulasi.com',
  email: 'info@butcepusulasi.com',
  description: 'Bütçe yönetimi, tasarruf ve finansal okuryazarlık üzerine sade, bağımsız ve uygulanabilir rehberler.',
} as const;

export const CATEGORIES = {
  butceleme: {
    name: 'Bütçeleme',
    description: 'Gelirinizi planlamak, giderlerinizi görmek ve paranıza yön vermek için pratik yöntemler.',
  },
  tasarruf: {
    name: 'Tasarruf',
    description: 'Gündelik harcamaları bilinçli biçimde azaltmaya yardımcı olacak gerçekçi öneriler.',
  },
  'finansal-egitim': {
    name: 'Finansal Eğitim',
    description: 'Temel finans kavramlarını anlamak ve daha bilinçli kararlar vermek için açıklayıcı içerikler.',
  },
} as const;

export type Category = keyof typeof CATEGORIES;
