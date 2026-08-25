import { describe, expect, it } from 'vitest';
import { coverSvg } from '../src/lib/cover-art';
import type { Category } from '../src/lib/site';

const covers: Array<[string, Category]> = [
  ['50-30-20-kurali', 'butceleme'], ['finansal-okuryazarlik-nedir', 'finansal-egitim'],
  ['zarf-yontemi-butceleme', 'butceleme'], ['finansal-hedef-belirleme', 'finansal-egitim'],
  ['basit-butce-sistemi', 'butceleme'], ['maas-gelmeden-biten-para', 'tasarruf'],
  ['gizli-abonelikler', 'tasarruf'], ['market-alisverisi-tasarruf', 'tasarruf'],
  ['acil-durum-fonu', 'butceleme'], ['gelir-gider-tablosu-sablonu', 'butceleme'],
  ['kredi-karti-ekstresi-okuma', 'finansal-egitim'], ['cocuklara-para-egitimi', 'finansal-egitim'],
];

describe('cover art', () => {
  it('is byte-identical for the same slug and category', () => {
    for (const [slug, category] of covers) expect(coverSvg(slug, category)).toBe(coverSvg(slug, category));
  });

  it('generates a distinct cover for every article', () => {
    const output = covers.map(([slug, category]) => coverSvg(slug, category));
    expect(new Set(output).size).toBe(covers.length);
  });
});
