const fs = require('fs');

// HTML'i oku
const html = fs.readFileSync('./assets/story.html', 'utf8');

// Passage'ları bul
const passageRegex = /<tw-passagedata.*?pid="(\d+)".*?name="(.*?)".*?>([\s\S]*?)<\/tw-passagedata>/g;
const passages = {};

let match;
while ((match = passageRegex.exec(html)) !== null) {
  const [, pid, name, content] = match;
  
  // Link'leri bul [[text]] veya [[text->target]]
  const links = [];
  const linkRegex = /\[\[(.*?)\]\]/g;
  let linkMatch;
  
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const linkText = linkMatch[1];
    if (linkText.includes('->')) {
      const [text, target] = linkText.split('->');
      links.push({ text: text.trim(), target: target.trim() });
    } else {
      links.push({ text: linkText, target: linkText });
    }
  }
  
  // Linkleri temizlenmiş metinden çıkar
  const cleanContent = content.replace(/\[\[.*?\]\]/g, '');
  
  passages[name] = {
    pid,
    name,
    content: cleanContent.trim(),
    links
  };
}

// JSON'a kaydet
fs.writeFileSync('./assets/story.json', JSON.stringify(passages, null, 2));
console.log('Hikaye parse edildi! Toplam passage:', Object.keys(passages).length);
