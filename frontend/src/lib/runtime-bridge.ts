const AMBIENT_CLASS = 'ambient-midnight';
const GLITCH_CLASS = 'ztmy-global-glitch';

const niraArtLines = [
  '',
  ':::::::::::::::::::::::::::::::-======--:-=--::.:::-:::--:::',
  '::::::::::::::::::::::--::::::======-::--=---..::::::::--:::',
  '::::::::::::-+#####*+=-=++***######*+-=---+**++=:..::..::..:',
  ':::::::::::=#####+-+=+################*=--+**###*=:::...::::',
  '::::::::::=#####+---*###################*=---=####+:........',
  ':::::::::-######--=#######################+---+####=........',
  ':::::::::+#####+--#########################=--=####*........',
  '::::::::-+*%##%=-*##########%###*#**##++###*--+####*-.......',
  '::::::::-++*=-+--%###=+#####%###*#**###:*###=-**###==...::::',
  ':::::::::+++----+###+:**####%#####*=##%-:*##+---+*==-...::..',
  ':::::::::+++----*###::#+####%*####*-##%=:=##*---+==+::::::::',
  '::::::::::*++=--*##+::#-#####*#####=*##=:=##*--=+++:::..::..',
  ':::::::::::+**+-**#::-#=*%###*####*-*#*=:-##*-=+=-..:.......',
  ':::::::::::::=--*+#-=-+--++#*+*##*=-==---:**+---............',
  ':::::::::::::+-+*#=====++**:::::*+*******+**-:.....:...:...',
  '::::::::::::-+*##*=+##+**=:::::=#*=+#::=++-:.:::::::::::::',
  ':::::::::::::::-=+-.=+===-:::::-==-=-:--=---::-...::..::..',
  '::::::::::::-::-==-==--:::::::::--:::-:---::-:-:::::..::::',
  '::::::::::::=::-:=:::::::::-=::::::::::-::::-:-::::.......',
  '::::::::::::-:::--=:::::::::::::::::::+=::--.:-...........',
  '::::::::::::::---=+-:::::::--::::::::-==---:.:-...........',
  '::::::::::::::::+*+++::::::::::::::-:.+++--:.:-:..........',
  ':::::::::::::::=++*++---:::::::::-:..:*+*=--:---::::..:-::',
  ':::::::::::::::=++++:..+#+=:-==+#:...:==--:.:-:..::..:-..',
  ':::::::::::::::=+++-..*#*+--+*##......---:..:::::::::-::',
  ':::::::::::::::-+++=:-*###++####:.....---:....:::::::-::',
  ':::::::::::::::-*++++############=....---:......::..:-..',
  '::::::::::::::::**####*+##########*+-.---:......::..:-..',
  '::::::::::::::-+#######*##############+=-:......::..:-:.',
  '::::::::::::=*#########*+*##############*=..--::--::--::',
  '::::::::::::-############*##################*--:..::..:-:.',
  '::::::::::::##################################--::::...:::',
  ':::::::::::+####################*#############+-::::......',
  ':::::::::::############+-*******--+############-..........',
  '::::::::::+##########*---=****+=---=###########=..........',
  '::::::::::#######%###*+=---=**=--=**####%#######..........',
  ':::::::::+##%#######****==+++++--****########%##+--:..:-::',
  '::::::::-###%#######******++=------+*########%###:::..:-:.',
  '::::::::+###%#######****+++-:.....::+############+--:::-::',
  ':::::::-#############**=--...........-*###########--:::-::',
  '',
];

const niraColors = ['#7c3aed', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

function buildColoredArt(): string {
  const lineCount = niraArtLines.length;
  const segmentSize = Math.ceil(lineCount / niraColors.length);
  let result = '';
  for (let i = 0; i < lineCount; i++) {
    const colorIdx = Math.min(Math.floor(i / segmentSize), niraColors.length - 1);
    result += `%c${niraArtLines[i]}\n`;
  }
  return result;
}

function buildColorStyles(): string[] {
  const lineCount = niraArtLines.length;
  const segmentSize = Math.ceil(lineCount / niraColors.length);
  const styles: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const colorIdx = Math.min(Math.floor(i / segmentSize), niraColors.length - 1);
    styles.push(`color:${niraColors[colorIdx]};font-size:12px;line-height:1.3;font-family:monospace;`);
  }
  return styles;
}

const knownHints = [
  '🌙 Try visiting between 00:00–00:05 local time, or add ?midnight to the URL',
  '📼 The 404 page has a clickable cassette tape...',
].join('\n');

function toggleAmbient() {
  const body = document.body;
  if (body.classList.contains(AMBIENT_CLASS)) {
    body.classList.remove(AMBIENT_CLASS);
    console.log('%c🌙 Ambient mode OFF', 'color:#888;font-size:12px;');
  } else {
    body.classList.add(AMBIENT_CLASS);
    console.log('%c🌙 Ambient mode ON', 'color:#ffcf00;font-size:14px;font-weight:bold;');
  }
}

function triggerGlitch() {
  const el = document.createElement('div');
  el.className = GLITCH_CLASS;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
  console.log('%c⚡ Glitch burst!', 'color:#0ff;font-size:14px;font-weight:bold;');
}

function showNira() {
  console.log(buildColoredArt(), ...buildColorStyles());
}

function showHints() {
  console.log(
    '%c🔍 Hidden features hints:\n%s',
    'color:#0dcaf0;font-size:13px;font-weight:bold;',
    knownHints,
  );
}

export function initRuntimeBridge() {
  if (typeof window === 'undefined') return;

  (window as any).ztmy = {
    glitch: triggerGlitch,
    midnight: toggleAmbient,
    nira: showNira,
    songs: showHints,
  };
}
