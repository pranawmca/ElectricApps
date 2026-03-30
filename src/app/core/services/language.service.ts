import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  
  // High-performance signals for real-time reactivity
  private isHindi = signal<boolean>(localStorage.getItem('lang_hindi') === 'true');

  // Unified Premium Dictionary
  private dictionary: { [key: string]: { en: string, hi: string } } = {
    // Shared UI
    'Welcome': { en: 'Welcome', hi: 'सुस्वागतम' },
    'Dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
    'Inventory': { en: 'Inventory', hi: 'इन्वेंटरी' },
    'Master': { en: 'Master', hi: 'मास्टर डेटा' },
    'Finance': { en: 'Finance', hi: 'वित्त विभाग' },
    'Localization': { en: 'Localization', hi: 'स्थानीयकरण' },
    'Search': { en: 'Search', hi: 'खोजें' },
    'Confirm': { en: 'Confirm', hi: 'पुष्टि करें' },
    'Cancel': { en: 'Cancel', hi: 'रद्द करें' },
    'Select Products': { en: 'Select Products', hi: 'उत्पाद चुनें' },
    'Product Name / SKU': { en: 'Product Name / SKU', hi: 'उत्पाद का नाम / SKU' },
    'Select All': { en: 'Select All', hi: 'सब चुनें' },
    'PRODUCT NAME': { en: 'PRODUCT NAME', hi: 'उत्पाद का नाम' },
    'LOCATION (RACK)': { en: 'LOCATION (RACK)', hi: 'स्थान (रैक)' },
    'EXPIRY TRACK': { en: 'EXPIRY TRACK', hi: 'समाप्ति ट्रैकिंग' },
    'STATUS': { en: 'STATUS', hi: 'स्थिति' },
    'Add Selected Products': { en: 'Add Selected Products', hi: 'चुने हुए उत्पाद जोड़ें' },
    'products selected': { en: 'products selected', hi: 'उत्पाद चुने गए' },
    'Category': { en: 'Category', hi: 'श्रेणी' },
    'Sub Category': { en: 'Sub Category', hi: 'उप-श्रेणी' },
    'STOCK': { en: 'STOCK', hi: 'स्टॉक' },
    'AVAILABLE': { en: 'AVAILABLE', hi: 'उपलब्ध' },
    'Out of Stock': { en: 'Out of Stock', hi: 'स्टॉक में नहीं' },
    'Already Added': { en: 'Already Added', hi: 'पहले से जोड़ा गया' },
    'Required': { en: 'Required', hi: 'अनिवार्य' },
    'No': { en: 'No', hi: 'नहीं' },
    'EXPIRED': { en: 'EXPIRED', hi: 'समाप्त (Expired)' },

    // Product Data Translation (Common Examples)
    'Aloo Bhujia': { en: 'Aloo Bhujia', hi: 'आलू भुजिया' },
    'Snacks': { en: 'Snacks', hi: 'नमकीन (स्नैक्स)' },
    'Personal Care': { en: 'Personal Care', hi: 'पर्सनल केयर' },
    'Smart Electrical': { en: 'Smart Electrical', hi: 'स्मार्ट इलेक्ट्रिकल' },
    'PACKET': { en: 'PACKET', hi: 'पैकेट' },
    'KG': { en: 'KG', hi: 'किग्रा' },
    'PCS': { en: 'PCS', hi: 'पीस' },
    'PIECE': { en: 'PIECE', hi: 'पीस' },
    'BOTTLE': { en: 'BOTTLE', hi: 'बोतल' },
    'ROLL': { en: 'ROLL', hi: 'रोल' },
    'Main Warehouse': { en: 'Main Warehouse', hi: 'मुख्य गोदाम' },
    'Cable & Wire Warehouse': { en: 'Cable & Wire Warehouse', hi: 'केबल और वायर गोदाम' },
    'Lighting Warehouse': { en: 'Lighting Warehouse', hi: 'लाइटिंग गोदाम' },
    'N/A': { en: 'N/A', hi: 'उपलब्ध नहीं' },
    // Product Data Translation (More items)
    'Anti-Dandruff Shampoo': { en: 'Anti-Dandruff Shampoo', hi: 'डैंड्रफ-रोधी शैम्पू' },
    'Bathing Soap': { en: 'Bathing Soap', hi: 'नहाने का साबुन' },
    'Ceiling Fan 48 Inch': { en: 'Ceiling Fan 48 Inch', hi: 'छत का पंखा (48 इंच)' },
    'Chakki Fresh Atta': { en: 'Chakki Fresh Atta', hi: 'चक्की फ्रेश आटा' },
    'Coaxial Cable 90M': { en: 'Coaxial Cable 90M', hi: 'कोएक्सियल केबल (90मी)' },
    'Copper Wire 1.5 SQMM': { en: 'Copper Wire 1.5 SQMM', hi: 'कॉपर वायर (1.5 SQMM)' },
    'Grains & Pulses': { en: 'Grains & Pulses', hi: 'अनाज और दालें' },
    'GROC017': { en: 'GROC017', hi: 'ग्रोसरी-017' },
    'GROC016': { en: 'GROC016', hi: 'ग्रोसरी-016' },
    
    // Purchase/Sale Specifics
    'Quick Sale': { en: 'Quick Sale', hi: 'त्वरित बिक्री' },
    'Direct sale entry with automatic stock deduction': { en: 'Direct sale entry with automatic stock deduction', hi: 'स्वचालित स्टॉक कटौती के साथ सीधी बिक्री प्रविष्टि' },
    'Scanner Active': { en: 'Scanner Active', hi: 'स्कैनर सक्रिय' },
    'Scanning...': { en: 'Scanning...', hi: 'स्कैन हो रहा है...' },
    'Confirm Sale & Deduct Stock': { en: 'Confirm Sale & Deduct Stock', hi: 'बिक्री और स्टॉक कम करें' },
    'Items to Sell': { en: 'Items to Sell', hi: 'बिक्री का सामान' },
    'Search & Add Products': { en: 'Search & Add Products', hi: 'उत्पाद खोजें और जोड़ें' },
    'Product Description*': { en: 'Product Description*', hi: 'उत्पाद विवरण*' },
    'Rate*': { en: 'Rate*', hi: 'दर*' },
    'Rate (₹)': { en: 'Rate (₹)', hi: 'दर (₹)' },
    'Total (₹)': { en: 'Total (₹)', hi: 'कुल (₹)' },
    'Actions': { en: 'Actions', hi: 'कार्रवाई' },
    'Qty/Pkt/kg': { en: 'Qty/Pkt/kg', hi: 'मात्रा/पैकेट/किग्रा' },
    'QTY': { en: 'QTY', hi: 'मात्रा' },
    'Unit': { en: 'Unit', hi: 'इकाई' },
    'GST %': { en: 'GST %', hi: 'जीएसटी %' },
    'Disc %': { en: 'Disc %', hi: 'छूट %' },
    'Mfg Date': { en: 'Mfg Date', hi: 'उत्पादन तिथि' },
    'Exp Date': { en: 'Exp Date', hi: 'समाप्ति तिथि' },
    'Customer Source*': { en: 'Customer Source*', hi: 'ग्राहक का स्रोत*' },
    'Order Status*': { en: 'Order Status*', hi: 'ऑर्डर की स्थिति*' },
    'Sale Date': { en: 'Sale Date', hi: 'बिक्री की तिथि' },
    'Exp. Delivery Date': { en: 'Exp. Delivery Date', hi: 'अनुमानित डिलीवरी तिथि' },
    'Sale Remarks': { en: 'Sale Remarks', hi: 'बिक्री टिप्पणी' },
    'Sub Total': { en: 'Sub Total', hi: 'उप-कुल' },
    'Grand Total': { en: 'Grand Total', hi: 'कुल योग' },
    'Total Tax (GST):': { en: 'Total Tax (GST):', hi: 'कुल टैक्स (जीएसटी):' },
    'TDS (%)': { en: 'TDS (%)', hi: 'टीडीएस (%)' },
    'TCS (%)': { en: 'TCS (%)', hi: 'टीसीएस (%)' },

    // Sidebar Modules
    'Quick Inventory': { en: 'Quick Inventory', hi: 'त्वरित इन्वेंटरी' },
    'Purchase Order': { en: 'Purchase Order', hi: 'खरीद आदेश' },
    'Sale Order': { en: 'Sale Order', hi: 'बिक्री आदेश' },
    'GRN List': { en: 'GRN List', hi: 'GRN सूची' },
    'Current Stock': { en: 'Current Stock', hi: 'वर्तमान स्टॉक' },
    'Purchase Return': { en: 'Purchase Return', hi: 'खरीद वापसी' },
    'Sale Return': { en: 'Sale Return', hi: 'बिक्री वापसी' },
    'Gate Pass': { en: 'Gate Pass', hi: 'गेट पास' },
    'Disposed Stock': { en: 'Disposed Stock', hi: 'निस्तारित माल' },
    'Admin': { en: 'Admin', hi: 'एडमिनिस्ट्रेशन' },
    'Print Settings': { en: 'Print Settings', hi: 'प्रिंट सेटिंग' }
  };

  get isHindiMode() {
    return this.isHindi();
  }

  setHindiMode(val: boolean) {
    this.isHindi.set(val);
    localStorage.setItem('lang_hindi', val.toString());
  }

  translate(key: string): string {
    const entry = this.dictionary[key];
    if (!entry) return key;
    return this.isHindi() ? entry.hi : entry.en;
  }
}
