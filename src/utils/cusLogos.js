const CUS_LOGO_RULES = [
    { match: ['7eleven', '7-eleven', '7 eleven'], logo: '/logos/7eleven.png', shortName: '7-Eleven' },
    { match: ['ทรูมูฟ', 'truemove', 'true'], logo: '/logos/truemove.png', shortName: 'TrueMove H' },
    { match: ['cj express', 'cj more', 'ซีเจ'], logo: '/logos/cj-express.png', shortName: 'CJ Express' },
    { match: ['s&p'], logo: '/logos/snp.png', shortName: 'S&P' },
    { match: ['คัดสรร', 'kudsan'], logo: '/logos/kudsan.svg', shortName: 'คัดสรร' },
    { match: ['ไทยสมาร์ทคาร์ด', 'smartcard', 'smart card'], logo: '/logos/thaismartcard.svg', shortName: 'ไทยสมาร์ทคาร์ด' },
    { match: ['ร่วมเจริญพัฒนา', 'ท็อปเจริญ', 'topcharoen'], logo: '/logos/topcharoen.png', shortName: 'แว่นท็อปเจริญ' },
    { match: ['กสิกรไทย', 'kbank', 'kasikorn'], logo: '/logos/kbank.png', shortName: 'กสิกรไทย' },
    { match: ['pizza company', 'เดอะ พิซซ่า'], logo: '/logos/pizza-company.png', shortName: 'The Pizza Company' },
    { match: ['เบอร์เกอร์คิง', 'burger king'], logo: '/logos/burger-king.png', shortName: 'Burger King' },
    { match: ['มินิบิ๊กซี', 'บิ๊กซี', 'big c', 'bigc'], logo: '/logos/mini-bigc.png', shortName: 'Mini Big C' },
    { match: ['potato corner'], logo: '/logos/potato-corner.png', shortName: 'Potato Corner' },
    { match: ['ไทย ฟู้ดส์', 'ไทยฟู้ดส์', 'thai foods'], logo: '/logos/thai-foods.png', shortName: 'Thai Foods' },
    { match: ['เอ็ม เค', 'เอ็มเค', 'mk'], logo: '/logos/mk.ico', shortName: 'MK' },
    { match: ['chester', 'เชสเตอร์'], logo: '/logos/chester.png', shortName: "Chester's" },
    { match: ['unilever', 'ยูนิลีเวอร์'], logo: '/logos/unilever.png', shortName: 'Unilever' },
    { match: ['สเวนเซ่นส์', 'swensen'], logo: '/logos/swensens.png', shortName: "Swensen's" },
    { match: ['ลูกค้ารายย่อย'], logo: '/logos/retail.svg', shortName: 'ลูกค้ารายย่อย' },
    { match: ['ยาโยอิ', 'yayoi'], logo: '/logos/yayoi.png', shortName: 'Yayoi' },
    { match: ['oishi', 'โออิชิ'], logo: '/logos/oishi.png', shortName: 'Oishi' }
];

export function getCusLogo(companyName) {
    const normalized = String(companyName || '').trim().toLowerCase();
    if (!normalized || normalized === '-') return null;
    for (const rule of CUS_LOGO_RULES) {
        if (rule.match.some((keyword) => normalized.includes(keyword))) {
            return rule;
        }
    }
    return null;
}
