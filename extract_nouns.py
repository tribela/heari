import re
import urllib.request
from collections import Counter

URL = 'https://raw.githubusercontent.com/han-dle/pd-korean-noun-list-for-wordles/main/src/CommonNouns.js'
HANGUL = re.compile(r'^[가-힣]+$')
MIN_LEN = 2
MAX_LEN = 4

resp = urllib.request.urlopen(URL)
data = resp.read().decode('utf-8')
words = re.findall(r"'([^']+)'", data)
hangul_words = [w for w in words if HANGUL.match(w)]

len_dist = Counter(len(w) for w in hangul_words)

print('=== 글자수별 명사 개수 ===')
for length in sorted(len_dist):
    print(f'{length:>2}글자: {len_dist[length]:>6,}개')

game_words = sorted(w for w in hangul_words if MIN_LEN <= len(w) <= MAX_LEN)
with open('words.txt', 'w', encoding='utf-8') as f:
    for w in game_words:
        f.write(w + '\n')

print(f'\nwords.txt: {len(game_words):,}개 ({MIN_LEN}-{MAX_LEN}글자)')
print(f'전체: {len(hangul_words):,}개 (한글 명사)')
