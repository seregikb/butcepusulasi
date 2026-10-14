import { CONTACT } from '@/data/contact';

export const PLACEHOLDERS = {
  RECIPIENT_LEGAL_NAME: 'Adnan Kahveci Neighborhood',
  RECIPIENT_ADDRESS: CONTACT.addressLines.join(', '),
  RECIPIENT_KVKK_CONTACT_EMAIL: CONTACT.email,
  DATA_CONTROLLER_LEGAL_NAME: CONTACT.companyTitle,
  LEAD_PURPOSE_TR: 'kişiselleştirilmiş bütçe özeti hazırlanması ve talebiniz doğrultusunda sizinle iletişim kurulması',
  RETENTION_PERIOD_TR: 'talebinizin sonuçlandırılmasından itibaren 2 yıl',
} as const;
