
const raw = document.getElementById('src').textContent;
const src = raw.replace(/\[!\[([^\]]+)\]\(([^)]+)\)\]\(([^)]+)\)/g, '<a href="$3"><img src="$2" alt="$1" /></a>');
document.getElementById('preview').innerHTML = marked.parse(src);
