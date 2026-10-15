interface LinkSentence {
  before: string;
  anchor: string;
  after: string;
}

interface ArticleFunnelLinks {
  midAfterHeading: string;
  mid: LinkSentence;
  end: LinkSentence;
}

export const ARTICLE_FUNNEL_LINKS = {
  '50-30-20-kurali': {
    midAfterHeading: 'Maaşınızı adım adım nasıl bölersiniz?',
    mid: {
      before: 'Bu hesaplamayı kendi gelir ve giderlerinize uyarlarken ',
      anchor: 'kişisel bütçe dağılımı ve XLSX şablonu',
      after: ' rakamları tek yerde görmenize yardımcı olabilir.',
    },
    end: {
      before: 'Oranları düzenli takip etmek için ',
      anchor: 'gelirinize göre bütçe özeti ve tablo şablonu',
      after: ' da kullanabilirsiniz.',
    },
  },
  'acil-durum-fonu': {
    midAfterHeading: 'Adım 1: Aylık zorunlu gideri hesaplayın',
    mid: {
      before: 'Zorunlu gider toplamınızı kaydederken ',
      anchor: 'kişisel bütçe planı ve gelir gider tablosu',
      after: ' fon hedefini aylık bütçeyle birlikte gösterebilir.',
    },
    end: {
      before: 'Fon katkısını diğer giderlerle dengelemek için ',
      anchor: 'kişisel bütçe özeti ve XLSX tablosu',
      after: ' kullanılabilir.',
    },
  },
  'basit-butce-sistemi': {
    midAfterHeading: 'Adım 1: Net geliri ve zorunlu giderleri yazın',
    mid: {
      before: 'Net gelir ve zorunlu gider hesabını ',
      anchor: 'kişisel bütçe dağılımı şablonuna',
      after: ' aktararak kalan tutarı daha görünür hâle getirebilirsiniz.',
    },
    end: {
      before: 'Üç adımı tek tabloda sürdürmek için ',
      anchor: 'kişiselleştirilmiş bütçe özeti ve XLSX dosyası',
      after: ' kullanılabilir.',
    },
  },
  'cocuklara-para-egitimi': {
    midAfterHeading: '10–12 yaş: Basit bütçe ve fiyat karşılaştırması',
    mid: {
      before: 'Aile bütçesinden güvenli bir örnek hazırlamak için ',
      anchor: 'kişisel bütçe dağılımı ve tablo şablonu',
      after: ' sade bir başlangıç sağlayabilir.',
    },
    end: {
      before: 'Evdeki bütçe etkinliğini planlarken ',
      anchor: 'gelir ve giderlere göre hazırlanan bütçe özeti',
      after: ' yetişkinlerin kullanabileceği bir çerçeve sunar.',
    },
  },
  'finansal-hedef-belirleme': {
    midAfterHeading: 'M: Ölçülebilir bir tutar belirleyin',
    mid: {
      before: 'Hedef tutarını aylık katkıya dönüştürürken ',
      anchor: 'kişisel bütçe planı ve XLSX şablonu',
      after: ' hesaplamayı mevcut nakit akışıyla birleştirebilir.',
    },
    end: {
      before: 'Hedeflerin bütçedeki yerini izlemek için ',
      anchor: 'gelirinize uygun bütçe dağılımı ve tablo',
      after: ' kullanılabilir.',
    },
  },
  'finansal-okuryazarlik-nedir': {
    midAfterHeading: 'Gelir ve gider yönetimi',
    mid: {
      before: 'Kendi gelir-gider dengenizi görmek için ',
      anchor: 'kişisel bütçe özeti ve XLSX şablonu',
      after: ' bu temel hesabı düzenli bir kayda dönüştürebilir.',
    },
    end: {
      before: 'Öğrendiklerinizi aylık bir sisteme taşımak için ',
      anchor: 'kişiselleştirilmiş bütçe dağılımı tablosu',
      after: ' kullanılabilir.',
    },
  },
  'gelir-gider-tablosu-sablonu': {
    midAfterHeading: 'Adım 1: Net gelirleri yazın',
    mid: {
      before: 'Net gelir toplamından başlayarak ',
      anchor: 'kişisel bütçe dağılımı ve XLSX planı',
      after: ' için de aynı kesinleşmiş rakamları kullanabilirsiniz.',
    },
    end: {
      before: 'Tabloyu gelir yapınıza göre yorumlamak için ',
      anchor: 'kişisel bütçe özeti',
      after: ' ek bir dağılım sunar.',
    },
  },
  'gizli-abonelikler': {
    midAfterHeading: 'Adım 1: Banka ve kart hareketlerini tarayın',
    mid: {
      before: 'Bulduğunuz abonelikleri aylık plana eklemek için ',
      anchor: 'kişisel bütçe tablosu ve gelir-gider özeti',
      after: ' toplam etkiyi görünür kılabilir.',
    },
    end: {
      before: 'İptallerden açılan alanı yeniden planlamak için ',
      anchor: 'gelirinize göre bütçe dağılımı ve XLSX şablonu',
      after: ' kullanılabilir.',
    },
  },
  'kredi-karti-ekstresi-okuma': {
    midAfterHeading: 'İşlem listesini satır satır kontrol edin',
    mid: {
      before: 'Kontrol ettiğiniz işlemleri kategorilere ayırırken ',
      anchor: 'kişisel bütçe planı ve XLSX tablosu',
      after: ' ekstreyi aylık bütçeyle eşleştirmeye yardımcı olabilir.',
    },
    end: {
      before: 'Ekstre tutarlarını düzenli izlemek için ',
      anchor: 'gelir-gider dağılımınıza uygun bütçe özeti',
      after: ' kullanılabilir.',
    },
  },
  'maas-gelmeden-biten-para': {
    midAfterHeading: 'Harcama 1: Otomatik yenilenen abonelikler',
    mid: {
      before: 'Bu ilk görünmeyen gideri aylık planınıza eklerken ',
      anchor: 'kişisel bütçe dağılımı ve XLSX şablonu',
      after: ' diğer kalemlerle birlikte etkisini gösterebilir.',
    },
    end: {
      before: 'Tespit ettiğiniz yedi kalemi tek düzende izlemek için ',
      anchor: 'gelirinize göre hazırlanan bütçe özeti ve tablo',
      after: ' kullanılabilir.',
    },
  },
  'market-alisverisi-tasarruf': {
    midAfterHeading: 'Yöntem 1: Evdeki stokla başlayın',
    mid: {
      before: 'Stok kontrolünden çıkan gerçek ihtiyacı ',
      anchor: 'kişisel bütçe planı ve gelir-gider şablonuna',
      after: ' ekleyerek market sınırını diğer giderlerle birlikte görebilirsiniz.',
    },
    end: {
      before: 'Market bütçesini hane gelirine göre dengelemek için ',
      anchor: 'kişiselleştirilmiş bütçe dağılımı ve XLSX tablosu',
      after: ' kullanılabilir.',
    },
  },
  'zarf-yontemi-butceleme': {
    midAfterHeading: 'Adım 1: Gerçek harcamaları belirleyin',
    mid: {
      before: 'Gerçek harcama ortalamalarını ',
      anchor: 'kişisel bütçe dağılımı ve XLSX şablonuna',
      after: ' aktararak zarflara ayrılabilecek toplamı görebilirsiniz.',
    },
    end: {
      before: 'Zarf bakiyelerini aylık planla birlikte izlemek için ',
      anchor: 'gelirinize uygun bütçe özeti ve tablo',
      after: ' kullanılabilir.',
    },
  },
} as const satisfies Record<string, ArticleFunnelLinks>;
