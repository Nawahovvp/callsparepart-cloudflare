import QRCode from 'qrcode';
import { getCleanTeamPlant, getDesc } from './helpers';

export const printStickers = async (rows) => {
    if (!rows || (Array.isArray(rows) && rows.length === 0)) return;
    const items = Array.isArray(rows) ? rows : [rows];

    // Pre-generate QR codes for all items
    const qrMap = new Map();
    await Promise.all(items.map(async (row) => {
        const mat = (row["Material"] || "").toString().trim();
        if (mat && !qrMap.has(mat)) {
            try {
                const url = await QRCode.toDataURL(mat, {
                    margin: 0,
                    width: 100,
                    errorCorrectionLevel: 'M'
                });
                qrMap.set(mat, url);
            } catch (err) {
                console.error("QR Code generation error:", err);
            }
        }
    }));

    const uniqueName = new Date().getTime();
    const windowFeatures = 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0';
    const printWindow = window.open('about:blank', uniqueName, windowFeatures);

    const stickerHtml = items.map((row, index) => {
        const mat = (row["Material"] || "").toString().trim();
        const qrUrl = qrMap.get(mat) || '';
        return `
        <div class="sticker-container" style="${index < items.length - 1 ? 'page-break-after: always;' : ''}">
            <div class="header">SPARE PART STICKER</div>
            <div class="ticket-number">${row["Ticket Number"] || "-"}</div>
            
            <div class="field highlight-field">
                <div class="label">Store Name:</div>
                <div class="value">${row["Brand"] || "-"}</div>
            </div>
            
            <div class="field highlight-field">
                <div class="label">Team:</div>
                <div class="value">${row["Team"] || "-"}</div>
            </div>
            
            <!-- Material & QR Row -->
            <div class="material-qr-container">
                <div class="material-info">
                    <div class="mat-label">Material:</div>
                    <div class="mat-value">${mat || "-"}</div>
                </div>
                ${qrUrl ? `<div class="qr-box"><img src="${qrUrl}" alt="QR" /></div>` : ''}
            </div>

            <!-- Description Block -->
            <div class="desc-container">
                <div class="desc-label">Desc:</div>
                <div class="desc-value">${getDesc(row)}</div>
            </div>

            <div class="footer">
                <div class="footer-label">ศูนย์พื้นที่:</div>
                <div class="footer-value">${getCleanTeamPlant(row["TeamPlant"])}</div>
            </div>
        </div>
    `;}).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Sticker Print</title>
                <style>
                    @page {
                        size: 80mm 100mm;
                        margin: 0;
                    }
                    *, *::before, *::after {
                        box-sizing: border-box;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Prompt', sans-serif;
                        width: 80mm;
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .sticker-container {
                        border: 1.5px solid #000;
                        width: 76mm;
                        height: 96mm;
                        margin: 2mm auto;
                        padding: 2.2mm 3.2mm;
                        display: flex;
                        flex-direction: column;
                        box-sizing: border-box;
                        overflow: hidden;
                    }
                    .header {
                        text-align: center;
                        font-weight: 800;
                        font-size: 12pt;
                        border-bottom: 2px solid #000;
                        padding-bottom: 1.2mm;
                        margin-bottom: 1.2mm;
                        letter-spacing: 0.5px;
                        line-height: 1.15;
                    }
                    .ticket-number {
                        font-size: 15.5pt;
                        font-weight: 900;
                        text-align: center;
                        margin: 0 0 1.2mm 0;
                        padding: 1mm 2mm;
                        background: #f0f0f0;
                        border: 1px solid #ccc;
                        letter-spacing: 0.5px;
                        line-height: 1.15;
                    }
                    .field.highlight-field {
                        display: flex;
                        align-items: baseline;
                        margin-bottom: 1mm;
                        line-height: 1.2;
                    }
                    .field.highlight-field .label {
                        font-weight: 900;
                        width: 17mm;
                        min-width: 17mm;
                        font-size: 13.5pt;
                        line-height: 1.2;
                    }
                    .field.highlight-field .value {
                        flex: 1;
                        font-size: 14.5pt;
                        font-weight: 900;
                        line-height: 1.2;
                        word-break: break-word;
                    }
                    /* Material & QR Row */
                    .material-qr-container {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: 0.8mm;
                        margin-bottom: 1.2mm;
                        padding: 1mm 1.8mm;
                        background: #fdfdfd;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                    }
                    .material-info {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    .mat-label {
                        font-size: 11pt;
                        font-weight: 900;
                        color: #222;
                        line-height: 1.1;
                    }
                    .mat-value {
                        font-size: 17pt;
                        font-weight: 900;
                        letter-spacing: 0.5px;
                        line-height: 1.15;
                        color: #000;
                        margin-top: 0.5mm;
                    }
                    .qr-box {
                        width: 18mm;
                        height: 18mm;
                        min-width: 18mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #fff;
                        padding: 0.5mm;
                        border: 1px solid #ccc;
                        border-radius: 2px;
                        margin-left: 2mm;
                    }
                    .qr-box img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        display: block;
                    }
                    /* Description Block */
                    .desc-container {
                        display: flex;
                        flex-direction: column;
                        margin-bottom: 1.2mm;
                        line-height: 1.25;
                    }
                    .desc-label {
                        font-size: 11pt;
                        font-weight: 900;
                        color: #222;
                        line-height: 1.1;
                        margin-bottom: 0.3mm;
                    }
                    .desc-value {
                        font-size: 12.5pt;
                        font-weight: 800;
                        color: #000;
                        line-height: 1.25;
                        word-break: break-word;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .footer {
                        border-top: 2px dashed #000;
                        padding-top: 1.5mm;
                        margin-top: auto;
                        text-align: center;
                    }
                    .footer-label {
                        font-size: 11pt;
                        font-weight: bold;
                        margin-bottom: 0.5mm;
                        line-height: 1.1;
                    }
                    .footer-value {
                        font-size: 23pt;
                        font-weight: 900;
                        line-height: 1.1;
                    }
                </style>
            </head>
            <body>
                ${stickerHtml}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};
