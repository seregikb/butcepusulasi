interface LinkSentence {
  before: string;
  anchor: string;
  after: string;
}

interface ArticleFunnelLinks {
  first: LinkSentence & {
    insertAfter: string;
  };
  midAfterHeading: string;
  callout: {
    description: string;
    anchor: string;
  };
  mid: LinkSentence;
  end: LinkSentence;
}

export const ARTICLE_FUNNEL_LINKS = {
  '50-30-20-kurali': {
    first: {
      insertAfter: '50/30/20 kuralı,',
      before: ' ',
      anchor: 'kişisel gelir dağılımı bütçe planı',
      after: ' içinde',
    },
    midAfterHeading: 'Maaşınızı adım adım nasıl bölersiniz?',
    callout: {
      description: 'Gelir ve gider aralıklarınıza göre bu dağılımı kendi bütçeniz üzerinde görebilirsiniz.',
      anchor: '50/30/20 dağılımına göre kişisel bütçe tablosu',
    },
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
    first: {
      insertAfter: 'Acil durum fonu,',
      before: ' ',
      anchor: 'acil giderleri içeren kişisel bütçe planı',
      after: ' içinde',
    },
    midAfterHeading: 'Adım 1: Aylık zorunlu gideri hesaplayın',
    callout: {
      description: 'Aylık giderlerinizle fon hedefinizi aynı bütçe görünümünde değerlendirebilirsiniz.',
      anchor: 'Acil durum fonuna yer veren kişisel bütçe özeti',
    },
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
    first: {
      insertAfter: 'Bütçe yapmak için',
      before: ' ',
      anchor: 'üç adımlı sade kişisel bütçe planı',
      after: ' kullanılabilir;',
    },
    midAfterHeading: 'Adım 1: Net geliri ve zorunlu giderleri yazın',
    callout: {
      description: 'Gelirinizin zorunlu gider, esnek harcama ve hedefler arasındaki yerini görebilirsiniz.',
      anchor: 'Üç adımlı sisteme uygun bütçe dağılımı',
    },
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
    first: {
      insertAfter: 'yalnızca anlatılanlardan değil,',
      before: ' ',
      anchor: 'aile bütçesini gösteren sade plan',
      after: ' üzerinden ve',
    },
    midAfterHeading: '10–12 yaş: Basit bütçe ve fiyat karşılaştırması',
    callout: {
      description: 'Çocuklarla paylaşacağınız örnekleri hazırlarken hane bütçenizin sade bir özetini kullanabilirsiniz.',
      anchor: 'Aile bütçesi için gelir-gider özeti',
    },
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
    first: {
      insertAfter: '“Para biriktirmek istiyorum”',
      before: ' ',
      anchor: 'hedeflere ayrılmış aylık bütçe özeti',
      after: ' olmadan',
    },
    midAfterHeading: 'M: Ölçülebilir bir tutar belirleyin',
    callout: {
      description: 'Hedefler için ayırabileceğiniz tutarı mevcut gelir ve gider dengeniz içinde görebilirsiniz.',
      anchor: 'Finansal hedefleri içeren kişisel bütçe planı',
    },
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
    first: {
      insertAfter: 'Finansal okuryazarlık,',
      before: ' ',
      anchor: 'temel kararları içeren kişisel bütçe planı',
      after: ' gibi pratiklerle,',
    },
    midAfterHeading: 'Neden günlük yaşam için önemlidir?',
    callout: {
      description: 'Temel bütçe kavramlarını kendi aylık nakit akışınız üzerinde değerlendirebilirsiniz.',
      anchor: 'Temel nakit akışını gösteren bütçe özeti',
    },
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
    first: {
      insertAfter: 'Gelir gider tablosu,',
      before: ' ',
      anchor: 'aylık rakamlara dayalı bütçe dağılımı',
      after: ' için',
    },
    midAfterHeading: 'Adım 1: Net gelirleri yazın',
    callout: {
      description: 'Tablodaki aylık rakamları kişisel bir bütçe dağılımına dönüştürebilirsiniz.',
      anchor: 'Aylık gelir-gider verilerine göre bütçe planı',
    },
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
    first: {
      insertAfter: 'Birçok dijital hizmet',
      before: ', ',
      anchor: 'abonelikleri izleyen kişisel bütçe görünümü',
      after: ' kullanılmadığında,',
    },
    midAfterHeading: 'Adım 1: Banka ve kart hareketlerini tarayın',
    callout: {
      description: 'Düzenli ödemelerin bütçenizde kapladığı alanı diğer giderlerle birlikte görebilirsiniz.',
      anchor: 'Abonelikleri görünür kılan bütçe dağılımı',
    },
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
    first: {
      insertAfter: 'Kredi kartı ekstresi,',
      before: ' ',
      anchor: 'ekstre odaklı kişisel bütçe özeti',
      after: ' için',
    },
    midAfterHeading: 'İşlem listesini satır satır kontrol edin',
    callout: {
      description: 'Ekstredeki kalemleri aylık gelir ve gider planınızla birlikte değerlendirebilirsiniz.',
      anchor: 'Ekstre kalemlerini içeren kişisel bütçe tablosu',
    },
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
    first: {
      insertAfter: 'Maaşın son haftaya yetişmemesi',
      before: ' ',
      anchor: 'maaş döngüsüne göre kişisel bütçe planı',
      after: ' incelendiğinde',
    },
    midAfterHeading: 'Harcama 1: Otomatik yenilenen abonelikler',
    callout: {
      description: 'Fark edilmeden tekrarlanan giderlerin aylık bütçenizdeki toplam etkisini görebilirsiniz.',
      anchor: 'Gizli harcamalara göre bütçe özeti',
    },
    mid: {
      before: 'Bu ilk görünmeyen gideri ',
      anchor: 'aylık planınıza eklerken kişisel bütçe dağılımı ve XLSX şablonu',
      after: ' diğer kalemlerle birlikte etkisini gösterebilir.',
    },
    end: {
      before: 'Tespit ettiğiniz yedi kalemi tek düzende izlemek için ',
      anchor: 'gelirinize göre hazırlanan bütçe özeti ve tablo',
      after: ' kullanılabilir.',
    },
  },
  'market-alisverisi-tasarruf': {
    first: {
      insertAfter: 'Market harcaması',
      before: ' ',
      anchor: 'market payını gösteren hane bütçesi',
      after: ' içinde',
    },
    midAfterHeading: 'Yöntem 1: Evdeki stokla başlayın',
    callout: {
      description: 'Market için ayıracağınız sınırı hane geliriniz ve diğer giderlerinizle birlikte görebilirsiniz.',
      anchor: 'Market sınırını içeren hane bütçesi planı',
    },
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
    first: {
      insertAfter: 'Zarf yöntemi,',
      before: ' ',
      anchor: 'zarf kategorili kişisel bütçe dağılımı',
      after: ' kapsamında',
    },
    midAfterHeading: 'Adım 1: Gerçek harcamaları belirleyin',
    callout: {
      description: 'Zarf tutarlarını belirlerken kullanılabilir gelirinizi tek bir dağılımda değerlendirebilirsiniz.',
      anchor: 'Zarf kategorilerine uygun bütçe tablosu',
    },
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
