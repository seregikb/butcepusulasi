export const CONTACT = {
  phoneDisplay: '+90 (530) 072 01 10',
  phoneHref: '+905300720110',
  email: 'info@butcepusulasi.com',
  addressLines: [
    'Adnan Kahveci Mah., Çamlıtepe Sok. No: 24',
    '34528 Beylikdüzü / İstanbul',
  ],
} as const;

export const CONTACT_POSTAL_ADDRESS = {
  streetAddress: CONTACT.addressLines[0],
  addressLocality: 'Beylikdüzü',
  addressRegion: 'İstanbul',
  postalCode: '34528',
  addressCountry: 'TR',
} as const;
