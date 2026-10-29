(async function () {
  "use strict";

  const GAP_AFTER_WORD_MS = 3000;   // 단어 읽고 나서 쉬는 시간
  const GAP_AFTER_DEF_MS  = 1200;   // 영영풀이 끝나고 다음 단어로 넘어가기 전 쉬는 시간
  const GAP_BEFORE_MOTION_MS = 800; // 단어 읽고 나서 그림이 움직이기 시작하기까지
  const GAP_AFTER_MOTION_MS  = 1000; // 그림 움직임이 끝나고 영영풀이를 읽기까지

  const listView   = document.getElementById('list-view');
  const playerView = document.getElementById('player-view');
  const gridContainer = document.getElementById('grid-container');
  const wordCountEl = document.getElementById('word-count');
  const alphaStrip = document.getElementById('alpha-strip');
  const searchInput = document.getElementById('search-input');

  const cardImage = document.getElementById('card-image');
  const progressLabel = document.getElementById('progress-label');
  const statusPill = document.getElementById('status-pill');
  const backBtn = document.getElementById('back-btn');
  const autoBtn = document.getElementById('auto-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const cardStage = document.getElementById('card-stage');
  const cardFrame = document.getElementById('card-frame');
  const hsLayer = document.getElementById('hs-layer');
  const popup = document.getElementById('popup');
  const rotateHint = document.getElementById('rotate-hint');

  const audioW = document.getElementById('audio-w');
  const audioD = document.getElementById('audio-d');
  const audioR = document.getElementById('audio-r');
  const audioS = document.getElementById('audio-s');
  const motionVideo = document.getElementById('motion-video');
  const pulse = document.getElementById('pulse');
  const welcomeLine = document.getElementById('welcome-line');

  // ---------- 학생 식별 (관리자 페이지에서 만들어준 링크의 ?student= 값) ----------
  // 링크에 학생 값이 없거나, 등록되지 않은 값이면 단어장 대신 안내 화면만 보여줍니다.
  const studentId = new URLSearchParams(location.search).get('student') || null;

  function showGate(title, msg) {
    listView.classList.add('hidden');
    playerView.classList.add('hidden');
    const g = document.createElement('div');
    g.style.cssText = 'min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:Jua,sans-serif;';
    g.innerHTML = '<div style="font-size:48px;margin-bottom:12px">🔒</div>'
      + '<h2 style="margin:0 0 8px;font-size:22px"></h2>'
      + '<p style="margin:0;color:#666;line-height:1.5"></p>';
    g.querySelector('h2').textContent = title;
    g.querySelector('p').textContent = msg;
    document.body.appendChild(g);
  }

  // ---------- 학습 기록 저장 위치: kv 컬렉션의 "dkprog_학생ID" 문서 ----------
  let studentName = '학생';
  let prog = null;           // 서버에 저장된 학습 기록 (없으면 null)
  let progReadOk = false;    // 기록을 정상적으로 읽었는지 (읽기 실패 시 덮어쓰기 방지)
  const progDocId = studentId ? 'dkprog_' + studentId : null;

  // 'ok' | 'invalid' | 'error'
  async function verifyStudent() {
    if (!studentId || typeof db === 'undefined') return 'invalid';
    try {
      const [doc, pd] = await Promise.all([
        db.collection('students').doc(studentId).get(),
        db.collection('kv').doc(progDocId).get().catch(() => null),
      ]);
      if (!doc.exists) return 'invalid';
      studentName = doc.data().name || '학생';
      welcomeLine.textContent = `${studentName} 학생, 안녕하세요! 단어를 터치하면 읽어줘요`;
      if (pd) { progReadOk = true; prog = pd.exists ? pd.data() : null; }
      return 'ok';
    } catch (e) {
      return 'error';
    }
  }

  listView.classList.add('hidden');            // 확인이 끝나기 전에는 목록을 가려둡니다
  const studentCheck = verifyStudent();        // 데이터 파일 로딩과 동시에 진행

  // ---------- 데이터 로드 (파일들을 동시에 요청 — 순서대로 기다리지 않음) ----------
  // 코드 → 실제 영어 단어 (검색·진도 기록·정렬용). 파일 이름은 words.json의 코드 그대로 사용합니다.
  const wordNames = {"ABOV":"above","ACCI":"accident","ACRO":"acrobat","ACT0":"act","ADD0":"add","ADDR":"address","ADUL":"adult","AIRP":"aeroplane","AIRT":"airport","ALLI":"alligator","ALPH":"alphabet","AMBU":"ambulance","ANCH":"anchor","ANGR":"angry","ANIM":"animal","ANKL":"ankle","ANT0":"ant","APE0":"ape","APPL":"apple","AQUA":"aquarium","ARM0":"arm","ARMA":"armadillo","ARRO":"arrow","ARTI":"artist","ASTR":"astronaut","ATHL":"athlete","AUDI":"audience","AUTH":"author","AVAL":"avalanche","BABY":"baby","BAC1":"back","BAC2":"back","BAKE":"bake","BALA":"balance","BALL":"ball","BALN":"balloon","BANA":"banana","BAND":"band","BANG":"bandage","BANK":"bank","BANP":"bank","BARB":"barbecue","BARN":"barn","BASE":"baseball","BASK":"basket","BAT1":"bat","BAT2":"bat","BATH":"bath","BATT":"battery","BEAC":"beach","BEAD":"beard","BEAK":"beak","BEAR":"bear","BEAV":"beaver","BED0":"bed","BEE0":"bee","BEET":"beetle","BEHI":"behind","BELL":"bell","BELO":"below","BELT":"belt","BERR":"berry","BETW":"between","BICY":"bicycle","BIG0":"big","BINO":"binoculars","BIRD":"bird","BIRT":"birthday","BITE":"bite","BLAC":"black","BLAN":"blanket","BLIN":"blind","BLOO":"blood","BLOS":"blossom","BLOU":"blouse","BLOW":"blow","BLUE":"blue","BOAT":"boat","BODY":"body","BONE":"bone","BOOK":"book","BOOM":"boomerang","BOTL":"bottle","BOTM":"bottom","BOWL":"bowl","BOX0":"box","BOY0":"boy","BRAI":"brain","BRAN":"branch","BREA":"bread","BREK":"break","BRFS":"breakfast","BRID":"bride","BRIG":"bridge","BROW":"brown","BRUS":"brush","BUCK":"bucket","BUD0":"bud","BUIL":"building","BUL1":"bulb","BUL2":"bulb","BULL":"bulldozer","BURG":"burglar","BURN":"burn","BUS0":"bus","BUTE":"butter","BUTF":"butterfly","BUTN":"button","BUTT":"button","BUY0":"buy","CABB":"cabbage","CABI":"cabin","CACT":"cactus","CALC":"calculator","CALE":"calendar","CAML":"camel","CAMM":"camera","CAMP":"camp","CAN0":"can","CAND":"candle","CANO":"canoe","CAP0":"cap","CAR0":"car","CARN":"carnation","CARP":"carpenter","CARR":"carrot","CARY":"carry","CASS":"cassette","CAST":"castle","CAT0":"cat","CATC":"catch","CATE":"caterpillar","CAUL":"cauliflower","CAVE":"cave","CENT":"centipede","CERE":"cereal","CHAI":"chair","CHAM":"chameleon","CHAP":"champion","CHAR":"chart","CHAS":"chase","CHEA":"cheap","CHEC":"check out","CHEE":"cheer","CHES":"cheese","CHET":"cheetah","CHEX":"chess","CHEZ":"chest","CHIC":"chicken","CHLD":"child","CHMN":"chimney","CHMP":"chimpanzee","CHN0":"chin","CHOC":"chocolate","CHOI":"choir","CHOO":"choose","CHOP":"chopsticks","CHUR":"church","CIRC":"circle","CITY":"city","CLAP":"clap","CLAW":"claw","CLEA":"clean","CLIF":"cliff","CLIM":"climb","CLOC":"clock","CLOT":"clothes","CLOU":"cloud","CLOW":"clown","COAT":"coat","COBW":"cobweb","COCK":"cockpit","COCO":"coconut","COCU":"cocoon","COFF":"coffee","COLD":"cold","COLO":"colour","COMP":"compact disc","COMT":"computer","COND":"conductor","CONE":"cone","CONT":"continent","COOK":"cook","CORN":"corner","COTN":"cotton","COTU":"count","COU1":"country","COU2":"countryside","COUS":"cousin","COW0":"cow","CRAB":"crab","CRAN":"crane","CRAW":"crawl","CRAY":"crayon","CRIC":"cricket","CROC":"crocodile","CROW":"crow","CROX":"crowd","CROY":"crown","CRUT":"crutch","CRY0":"cry","CUB0":"cub","CUBE":"cube","CUCU":"cucumber","CUP0":"cup","CUPB":"cupboard","CURT":"curtain","CURV":"curve","CUSH":"cushion","CUT0":"cut","DAFF":"daffodil","DAIS":"daisy","DAM0":"dam","DANC":"dance","DAND":"dandelion","DAY0":"day","DEAF":"deaf","DEER":"deer","DENT":"dentist","DESE":"desert","DESK":"desk","DESS":"dessert","DETE":"detective","DGRM":"diagram","DIA1":"diamond","DIA2":"diamond","DIAR":"diary","DICT":"dictionary","DIFF":"different","DINN":"dinner","DINO":"dinosaur","DIRT":"dirty","DISG":"disguise","DIVE":"dive","DOCT":"doctor","DOG0":"dog","DOLL":"doll","DOLP":"dolphin","DONK":"donkey","DOOR":"door","DOUB":"double","DOWN":"down","DRAG":"dragon","DRAN":"dragonfly","DRAW":"draw","DRAX":"drawer","DRE1":"dress","DRE2":"dress","DRIL":"drill","DRIN":"drink","DRIV":"drive","DRO1":"drop","DRO2":"drop","DRUM":"drum","DRY0":"dry","DUCK":"duck","DUMP":"dump truck","EAGL":"eagle","EAR0":"ear","EARH":"earth","EARQ":"earthquake","EASE":"easel","EAT0":"eat","EGG0":"egg","EIGH":"eight","ELBO":"elbow","ELEC":"electricity","ELEP":"elephant","EMPT":"empty","EMU0":"emu","ENGI":"engine","ENGR":"engineer","ENTR":"enter","ENVE":"envelope","ENVI":"environment","EQUA":"equal","EQUT":"equator","ESCA":"escalator","EXER":"exercise","EXIT":"exit","EXPE":"expensive","EXPL":"explode","EYE0":"eye","FABL":"fable","FACE":"face","FACT":"fact","FACY":"factory","FAIR":"fair","FALL":"fall","FAMI":"family","FAN0":"fan","FARM":"farm","FAST":"fast","FAT0":"fat","FEAT":"feather","FIGH":"fight","FILM":"film","FING":"finger","FINP":"fingerprint","FINS":"finish","FIRE":"fire","FIRN":"fire engine","FIRS":"first","FIRT":"first aid","FIS1":"fish","FIS2":"fish","FIVE":"five","FLAG":"flag","FLIP":"flipper","FLOA":"float","FLOO":"flood","FLOU":"flour","FLOW":"flower","FLUT":"flute","FLY1":"fly","FLY2":"fly","FOG0":"fog","FOLD":"fold","FOOD":"food","FOOT":"foot","FOP1":"football","FOP2":"american football","FORE":"forest","FORK":"fork","FOSS":"fossil","FOUN":"fountain","FOUR":"four","FOX0":"fox","FRIE":"friend","FROG":"frog","FRON":"front","FRUI":"fruit","FRYP":"frying pan","FULL":"full","FUR0":"fur","FURN":"furniture","GAME":"game","GARA":"garage","GARB":"rubbish","GARD":"garden","GATE":"gate","GEOG":"geography","GIAN":"giant","GIRA":"giraffe","GIRL":"girl","GIVE":"give","GLAS":"glass","GLES":"glasses","GLOB":"globe","GLOV":"glove","GLUE":"glue","GOAL":"goal","GOAT":"goat","GOGG":"goggles","GOLD":"gold","GOLE":"goldfish","GOLF":"golf","GOOS":"goose","GORI":"gorilla","GRAA":"grandparent","GRAE":"grape","GRAF":"grapefruit","GRAS":"grass","GRAZ":"grasshopper","GREE":"green","GROW":"grow","GUIT":"guitar","GYMN":"gymnast","HABI":"habitat","HAIR":"hair","HALF":"half","HAMM":"hammer","HAND":"hand","HANE":"handle","HANG":"hang","HANR":"hangar","HAPP":"happy","HARB":"harbour","HAT0":"hat","HAWK":"hawk","HEAD":"head","HEAL":"headlight","HEAR":"hearing aid","HEE1":"heart","HEE2":"heart","HEEA":"heavy","HEEL":"heel","HELI":"helicopter","HELM":"helmet","HELP":"help","HIBE":"hibernate","HIDE":"hide","HIGH":"high","HILL":"hill","HIP0":"hip","HIPP":"hippopotamus","HOLD":"hold","HOLE":"hole","HONE":"honey","HOOF":"hoof","HOP0":"hop","HOR1":"horn","HOR2":"horn","HORS":"horse","HOSP":"hospital","HOT0":"hot","HOTE":"hotel","HOUS":"house","HUG0":"hug","HUGE":"huge","HUND":"hundred","HURR":"hurricane","HYEN":"hyena","ICE0":"ice","ICEC":"ice cream","ICEG":"iceberg","ICIC":"icicle","IGLO":"igloo","IGUA":"iguana","IMAG":"imaginary","INJE":"injection","INJU":"injure","INSE":"insect","INSI":"inside","INST":"instrument","INVE":"invent","INVI":"invite","IRON":"iron","ISLA":"island","IVY0":"ivy","JACK":"jacket","JAGU":"jaguar","JAM0":"jam","JAR0":"jar","JAW0":"jaw","JEAN":"jeans","JELL":"jellyfish","JEWE":"jewel","JIGS":"jigsaw puzzle","JUDO":"judo","JUG0":"jug","JUGG":"juggle","JUIC":"juice","JUMP":"jump","KANG":"kangaroo","KARA":"karate","KEY0":"key","KICK":"kick","KING":"king","KISS":"kiss","KITC":"kitchen","KITE":"kite","KITT":"kitten","KNEE":"knee","KNEL":"kneel","KNIF":"knife","KNIG":"knight","KNIT":"knit","KNOC":"knock","KNOT":"knot","KOAL":"koala","LABO":"laboratory","LADD":"ladder","LADY":"ladybird","LAKE":"lake","LAMB":"lamb","LAMP":"lamp","LAND":"land","LARG":"large","LAUG":"laugh","LAWN":"lawn","LEAF":"leaf","LEFT":"left","LEG0":"leg","LEMO":"lemon","LEOP":"leopard","LETR":"letter","LETT":"lettuce","LIBR":"library","LICK":"lick","LIFE":"lifeboat","LIFT":"lift","LIH1":"light","LIH2":"light","LIHS":"lighthouse","LING":"lightning","LION":"lion","LIP0":"lip","LIQU":"liquid","LITR":"litter","LITT":"little","LIZA":"lizard","LOBS":"lobster","LOCK":"lock","LOG0":"log","LONG":"long","LOOK":"look","LOSE":"lose","LOVE":"love","LOW0":"low","LUGG":"luggage","LUNC":"lunch","LUNG":"lung","MACH":"machine","MAGA":"magazine","MAGI":"magic","MAGN":"magnet","MAGS":"magnifying glass","MAMM":"mammal","MAN0":"man","MAP0":"map","MARK":"market","MASK":"mask","MATC":"match","MATH":"mathematics","MEAL":"meal","MEAS":"measure","MEAT":"meat","MECH":"mechanic","MEDA":"medal","MEDI":"medicine","MEET":"meet","MELT":"melt","META":"metal","MICR":"microphone","MICS":"microscope","MICW":"microwave oven","MIDN":"midnight","MILK":"milk","MINE":"mine","MINR":"mineral","MIRR":"mirror","MIX0":"mix","MONE":"money","MONK":"monkey","MONS":"monster","MONT":"month","MOON":"moon","MOSQ":"mosque","MOST":"mosquito","MOTH":"moth","MOTO":"motorcycle","MOUN":"mountain","MOUS":"mouse","MOUT":"mouth","MOUZ":"moustache","MOVE":"move","MUD0":"mud","MUSC":"muscle","MUSE":"museum","MUSH":"mushroom","MUSI":"music","MUSN":"musician","NAIL":"nail","NARR":"narrow","NATR":"nature","NECK":"neck","NEED":"needle","NEST":"nest","NET0":"net","NEW0":"new","NEWS":"newspaper","NEWT":"newt","NIGH":"night","NINE":"nine","NOIS":"noise","NOON":"midday","NOSE":"nose","NUMB":"number","NURS":"nurse","NUT1":"nut","NUT2":"nut","OAR0":"oar","OCEA":"ocean","OCTO":"octopus","OFFI":"office","OIL0":"oil","OLD0":"old","ONE0":"one","ONIO":"onion","OPEN":"open","OPER":"opera","OPPO":"opposite","OPTO":"optician","ORA1":"orange","ORA2":"orange","ORAN":"orang-utan","ORCH":"orchard","ORCS":"orchestra","ORGA":"organ","OSTR":"ostrich","OTTE":"otter","OUTS":"outside","OVAL":"oval","OVEN":"oven","OVER":"over","OWL0":"owl","OYST":"oyster","PACK":"package","PAGE":"page","PAI1":"paint","PAI2":"paint","PAIR":"pair","PALA":"palace","PALM":"palm","PALT":"palm tree","PAND":"panda","PANT":"panther","PANZ":"trousers","PAPE":"paper","PARA":"parachute","PARE":"parent","PARK":"park","PARQ":"park","PARR":"parrot","PART":"party","PASS":"passenger","PATH":"path","PATI":"patient","PAW0":"paw","PAY0":"pay","PEA0":"pea","PEAC":"peach","PEAK":"peacock","PEAN":"peanut","PEAR":"pear","PEAV":"pearl","PEBB":"pebble","PEE1":"peel","PEE2":"peel","PELI":"pelican","PEN0":"pen","PENC":"pencil","PENG":"penguin","PEOP":"people","PEPP":"pepper","PET0":"pet","PETA":"petal","PHOG":"photograph","PHOT":"photographer","PIAN":"piano","PICN":"picnic","PICT":"picture","PIE0":"pie","PIG0":"pig","PIGE":"pigeon","PILE":"pile","PILL":"pillow","PILO":"pilot","PIN0":"pin","PINE":"pineapple","PINK":"pink","PIPE":"pipe","PIRA":"pirate","PLAE":"planet","PLAN":"plant","PLAS":"plastic","PLAT":"plate","PLH1":"play","PLH2":"play","PLUM":"plum","PLUR":"plumber","POCK":"pocket","POEM":"poem","POIN":"point","POLA":"polar bear","POLC":"police officer","POLI":"polish","POLL":"pollution","POND":"pond","PONY":"pony","POPP":"poppy","PORC":"porcupine","POST":"post office","POTA":"potato","POUR":"pour","PRES":"present","PRIC":"price","PRIN":"prince","PRIZ":"prize","PROB":"problem","PROP":"propeller","PUDD":"puddle","PULL":"pull","PUMP":"pump","PUNC":"puncture","PUPA":"pupa","PUPP":"puppet","PUPY":"puppy","PURP":"purple","PUSH":"push","PUZZ":"puzzle","PYRA":"pyramid","PYTH":"python","QUAT":"quarter","QUEE":"queen","QUES":"question","QUIC":"quick","QUIE":"quiet","QUIL":"quilt","QUIZ":"quiz","RABB":"rabbit","RACC":"raccoon","RACE":"race","RACR":"racing car","RADA":"radar","RADI":"radio","RAFT":"raft","RAIL":"railway","RAIN":"rain","RANF":"rainforest","RANW":"rainbow","RAT0":"rat","REAC":"reach","READ":"read","RECR":"recorder","RECT":"rectangle","RECY":"recycle","RED0":"red","REFR":"refrigerator","REPA":"repair","REPT":"reptile","RESC":"rescue","REST":"restaurant","RHIN":"rhinoceros","RHYM":"rhyme","RIBB":"ribbon","RICE":"rice","RIDD":"riddle","RIDE":"ride","RIGH":"right","RIN1":"ring","RIN2":"ring","RIVE":"river","ROAD":"road","ROBO":"robot","ROC1":"rock","ROC2":"rock","ROCT":"rocket","ROLL":"roll","ROOF":"roof","ROOM":"room","ROOT":"root","ROPE":"rope","ROSE":"rose","ROUN":"round","ROW1":"row","ROW2":"row","RUG0":"rug","RULE":"ruler","RUN0":"run","RUNW":"runway","SAD0":"sad","SADD":"saddle","SAI1":"sail","SAI2":"sail","SALA":"salad","SALT":"salt","SAME":"same","SAND":"sand","SANW":"sandwich","SATE":"satellite","SAUC":"saucepan","SAW0":"saw","SCA1":"scale","SCA2":"scale","SCAR":"scarf","SCHO":"school","SCIE":"scientist","SCIS":"scissors","SCOR":"scorpion","SCRA":"scratch","SCRE":"screw","SCRU":"scrub","SEA0":"sea","SEAG":"seagull","SEAH":"sea horse","SEAL":"seal","SEAS":"season","SEAT":"seat belt","SEAW":"seaweed","SEE0":"see","SEED":"seed","SEES":"seesaw","SELL":"sell","SENT":"sentence","SEVE":"seven","SEW0":"sew","SHAD":"shadow","SHAK":"shake","SHAP":"shape","SHAR":"share","SHAX":"shark","SHAZ":"sharp","SHEE":"sheep","SHEF":"shelf","SHEL":"shell","SHIP":"ship","SHIR":"shirt","SHOE":"shoe","SHOO":"short","SHOR":"shoulder","SHOU":"shout","SHOV":"shovel","SHOW":"shower","SHRI":"shrimp","SHUT":"shut","SIDE":"side","SING":"sing","SINK":"sink","SIT0":"sit","SIX0":"six","SKAT":"skate","SKBD":"skateboard","SKEL":"skeleton","SKI0":"ski","SKIN":"skin","SKIP":"skip","SKIR":"skirt","SKY0":"sky","SKYS":"skyscraper","SLED":"sledge","SLEE":"sleep","SLIC":"slice","SLID":"slide","SLOW":"slow","SMAL":"small","SMIL":"smile","SNAI":"snail","SNAK":"snake","SNOO":"snow","SNOW":"snowman","SOAP":"soap","SOCC":"soccer","SOCK":"sock","SOLI":"solid","SPAC":"space","SPAF":"spacecraft","SPAR":"sparrow","SPEL":"spell","SPID":"spider","SPIL":"spill","SPOO":"spoon","SPOR":"sport","SQAR":"square","SQAS":"squash","SQEZ":"squeeze","SQRL":"squirrel","STAB":"stable","STAM":"stamp","STAN":"stand","STAR":"star","STAS":"starfish","STAT":"start","STAX":"state","STEE":"steering wheel","STEM":"stem","STON":"stone","STOP":"stopwatch","STOR":"shop","STOY":"story","STRA":"strawberry","STRE":"stream","STRF":"street","STRI":"string","STRP":"stripe","SUBM":"submarine","SUBT":"subtract","SUGA":"sugar","SUM0":"sum","SUN0":"sun","SUNG":"sunglasses","SUPE":"supermarket","SWAN":"swan","SWIM":"swim","SWMM":"swimming pool","SWNG":"swing","SYNA":"synagogue","TABL":"table","TADP":"tadpole","TAIL":"tail","TALL":"tall","TAMB":"tambourine","TAXI":"taxi","TEA0":"tea","TEAC":"teacher","TEAM":"team","TEAS":"tear","TEAT":"tear","TELE":"telephone","TELS":"telescope","TELV":"television","TEMP":"temple","TEN0":"ten","TENN":"tennis","TENT":"tent","THEA":"theatre","THER":"thermometer","THIG":"thigh","THIN":"thin","THOR":"thorn","THRA":"thread","THRE":"three","THRO":"throat","THUM":"thumb","TICK":"ticket","TIE1":"tie","TIE2":"tie","TIGE":"tiger","TILE":"tile","TIME":"time","TIPT":"tiptoe","TIRE":"tired","TOAD":"toad","TOBO":"toboggan","TOE0":"toe","TOIL":"toilet","TOMA":"tomato","TONG":"tongue","TOOL":"tool","TOOT":"tooth","TOOX":"toothbrush","TOP0":"top","TORN":"tornado","TOUC":"toucan","TOWE":"towel","TOWN":"town","TOY0":"toy","TRAC":"tractor","TRAF":"traffic","TRAI":"train","TRAN":"transparent","TRAY":"tray","TREA":"treasure","TREE":"tree","TRIA":"triangle","TRIC":"trick","TRIL":"tricycle","TROP":"trophy","TRUC":"truck","TRUM":"trumpet","TRUN":"trunk","TSHI":"t-shirt","TUGB":"tugboat","TULI":"tulip","TUNN":"tunnel","TURK":"turkey","TURT":"turtle","TUSK":"tusk","TWIG":"twig","TWIN":"twin","TWO0":"two","UMBR":"umbrella","UNDE":"under","UNDR":"underwear","UNDS":"undress","UNIC":"unicorn","UNIV":"university","UP00":"up","VACU":"vacuum cleaner","VALL":"valley","VEGE":"vegetable","VEHI":"vehicle","VET0":"vet","VIDE":"video tape","VILL":"village","VINE":"vine","VIOL":"violin","VOLC":"volcano","VULT":"vulture","WAGO":"wagon","WAIT":"waiter","WALK":"walk","WALL":"wallaby","WALT":"wallet","WALU":"walrus","WASH":"wash","WAT1":"watch","WAT2":"watch","WATE":"water","WATF":"waterfall","WATL":"water lily","WATM":"watermelon","WAV1":"wave","WAV2":"wave","WEAR":"wear","WEAT":"weather","WEDD":"wedding","WEEK":"week","WEIG":"weigh","WET0":"wet","WHAL":"whale","WHEA":"wheat","WHEE":"wheel","WHLB":"wheelbarrow","WHLC":"wheelchair","WHSK":"whiskers","WHSP":"whisper","WHST":"whistle","WHTE":"white","WIDE":"wide","WIND":"wind","WINE":"windmill","WINF":"window","WING":"wing","WIRE":"wire","WITC":"witch","WIZA":"wizard","WOLF":"wolf","WOMA":"woman","WOOD":"wood","WOOL":"wool","WORL":"world","WORM":"worm","WRIN":"wrinkle","WRIS":"wrist","WRIT":"write","XRAY":"x-ray","XYLO":"xylophone","YACH":"yacht","YAWN":"yawn","YEAR":"year","YELL":"yellow","YOGU":"yoghurt","YOLK":"yolk","YOUN":"young","ZEBR":"zebra","ZERO":"zero","ZIPP":"zipper","ZOO0":"zoo"};
  const [words, hotspots, motion, redAudioList] = await Promise.all([
    fetch('words.json').then(r => r.json()),
    // 터치 영역 좌표 (파란 단어 / 영영풀이 첫 줄 / 빨간 단어 / 그림). 없어도 앱은 동작합니다.
    fetch('hotspots.json').then(r => r.json()).catch(() => ({})),
    // 단어별 움직임 정보: { t:'v' 원본 애니메이션 영상 | t:'s' 효과음만, d:길이(초) }. 없으면 예전처럼 단어→영영풀이만.
    fetch('motion.json').then(r => r.json()).catch(() => ({})),
    // 빨간 단어 중 카드 단어와 모양이 다른 것(복수형·-ing·비교급 등)의 녹음 파일 목록. 없으면 TTS로 읽어줍니다.
    fetch('red_audio.json').then(r => r.json()).catch(() => []),
  ]);
  const checkResult = await studentCheck;
  if (checkResult === 'invalid') {
    showGate('선생님이 보내준 내 링크로 들어와 주세요', '주소가 잘못되었거나 일부가 지워졌어요. 받은 링크를 다시 눌러 주세요.');
    return;
  }
  if (checkResult === 'error') {
    showGate('연결을 확인해 주세요', '인터넷 연결이 불안정해요. 연결을 확인하고 링크를 다시 열어 주세요.');
    return;
  }
  listView.classList.remove('hidden');

  const redAudio = new Set(redAudioList);
  // 카드 순서를 코드순이 아니라 실제 단어의 알파벳순으로 정렬 (같은 단어는 words.json 순서 유지)
  const sortKey = (c) => String(wordNames[c] || c).toLowerCase().replace(/-/g, '');
  words.sort((a, b) => { const x = sortKey(a), y = sortKey(b); return x < y ? -1 : x > y ? 1 : 0; });
  const indexOfCode = new Map(words.map((c, i) => [c, i]));
  const nameOf = (code) => wordNames[code] || code;               // 실제 단어 (없으면 코드)
  const norm = (t) => String(t).toLowerCase().replace(/[\s\-]+/g, '');   // 소문자 + 공백/하이픈 무시

  // ---------- 학습 기록 (몇 바퀴 / 어디까지) ----------
  const FV = firebase.firestore.FieldValue;
  const LAST_IDX = words.length - 1;
  let saveTimer = null;
  let dirty = null;          // 아직 서버에 못 보낸 변경 내용

  function queueSave(fields) {
    dirty = Object.assign(dirty || {}, fields);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 2000);
  }
  function flushSave() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!dirty || !progDocId) return;
    const data = dirty; dirty = null;
    db.collection('kv').doc(progDocId)
      .set(Object.assign({ name: studentName, total: words.length, updatedAt: FV.serverTimestamp() }, data), { merge: true })
      .catch(() => { dirty = Object.assign(data, dirty || {}); });   // 실패하면 다음 기회에 다시 보냄
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
  window.addEventListener('pagehide', flushSave);

  // 단어 카드를 열 때 호출 (목록에서 터치 / 다음 버튼)
  function trackProgress(idx) {
    if (!prog || typeof prog.cycle !== 'number') return;      // 바퀴 수 입력 전에는 기록하지 않음
    // 마지막 단어까지 갔다가 첫 단어로 돌아오면 한 바퀴 완료 (서버 값을 +1 하므로 관리자가 고친 값도 유지됨)
    if (prog.reachedEnd && idx === 0) {
      prog.cycle += 1; prog.maxIdx = 0; prog.reachedEnd = false;
      queueSave({ cycle: FV.increment(1), maxIdx: 0, lastWord: nameOf(words[0]), reachedEnd: false });
      return;
    }
    const cur = typeof prog.maxIdx === 'number' ? prog.maxIdx : -1;
    if (idx > cur) {
      prog.maxIdx = idx;
      if (idx === LAST_IDX) prog.reachedEnd = true;
      queueSave({ maxIdx: idx, lastWord: nameOf(words[idx]), reachedEnd: !!prog.reachedEnd });
    }
  }

  // 처음 한 번만: 현재 몇 바퀴인지 학생이 직접 입력
  function askCycleIfNeeded() {
    if (!progReadOk) return Promise.resolve();                 // 기록을 못 읽었으면 묻지 않음 (기존 기록 보호)
    if (prog && typeof prog.cycle === 'number') return Promise.resolve();
    let cycleDone; const cyclePromise = new Promise(r => { cycleDone = r; });
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(36,31,94,.88);display:flex;align-items:center;justify-content:center;padding:20px;';
    ov.innerHTML = '<div style="background:#fffdf8;border-radius:20px;padding:28px 22px;max-width:340px;width:100%;text-align:center;font-family:Jua,sans-serif;color:#241f5e">'
      + '<p id="cy-msg" style="font-size:20px;line-height:1.5;margin:0 0 16px"></p>'
      + '<input id="cy-in" type="number" inputmode="numeric" min="1" max="10" placeholder="1 ~ 10" style="width:100%;font-size:28px;text-align:center;padding:10px;border-radius:12px;border:2px solid #cdeaff;outline:none;font-family:inherit;box-sizing:border-box">'
      + '<p id="cy-err" style="color:#e0483e;font-size:14px;min-height:20px;margin:8px 0 4px"></p>'
      + '<button id="cy-ok" style="width:100%;padding:12px;border:none;border-radius:12px;background:#241f5e;color:#fff;font-size:17px;font-family:inherit">확인</button>'
      + '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#cy-msg').textContent = `${studentName} 학생! 현재 DK 몇 바퀴인지 입력하세요! (숫자만)`;
    const input = ov.querySelector('#cy-in');
    const err = ov.querySelector('#cy-err');
    const ok = ov.querySelector('#cy-ok');
    async function submit() {
      const v = input.value.trim();
      const n = Number(v);
      if (!/^\d+$/.test(v) || n < 1 || n > 10) { err.textContent = '1부터 10 사이의 숫자만 입력해 주세요.'; return; }
      ok.disabled = true; err.textContent = '';
      try {
        await db.collection('kv').doc(progDocId).set(
          { cycle: n, name: studentName, total: words.length, cycleSetAt: FV.serverTimestamp() }, { merge: true });
        prog = { cycle: n, maxIdx: -1, reachedEnd: false };
        ov.remove();
        cycleDone();
      } catch (e) {
        ok.disabled = false;
        err.textContent = '저장하지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.';
      }
    }
    ok.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    return cyclePromise;
  }

  // ---------- 목록 화면 그리기 ----------
  function buildGrid(filterText) {
    gridContainer.innerHTML = '';
    alphaStrip.innerHTML = '';
    const q = norm((filterText || '').trim());
    const filtered = q ? words.filter(c => norm(nameOf(c)).includes(q)) : words;

    wordCountEl.textContent = q
      ? `검색 결과 ${filtered.length}개`
      : `전체 ${words.length}개 단어`;

    let lastLetter = null;
    const seenLetters = new Set();
    const frag = document.createDocumentFragment();

    filtered.forEach((code) => {
      const letter = (nameOf(code)[0] || code[0]).toUpperCase();   // 코드가 아니라 실제 단어의 첫 글자로 묶음
      if (letter !== lastLetter) {
        lastLetter = letter;
        const h = document.createElement('div');
        h.className = 'letter-heading';
        h.textContent = letter;
        h.id = 'letter-' + letter;
        frag.appendChild(h);
        seenLetters.add(letter);

        const wrap = document.createElement('div');
        wrap.className = 'grid';
        wrap.dataset.letter = letter;
        frag.appendChild(wrap);
      }
      const wrap = frag.lastChild;
      wrap.appendChild(makeCard(code));
    });

    gridContainer.appendChild(frag);

    // alphabet quick-nav (전체 목록일 때만 표시)
    if (!q) {
      [...seenLetters].forEach(letter => {
        const b = document.createElement('button');
        b.textContent = letter;
        b.addEventListener('click', () => {
          const target = document.getElementById('letter-' + letter);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        alphaStrip.appendChild(b);
      });
    }
  }

  function makeCard(code) {
    const idx = words.indexOf(code);
    const card = document.createElement('div');
    card.className = 'word-card';

    const pic = document.createElement('img');
    pic.className = 'pic';
    pic.loading = 'lazy';
    pic.src = `assets/thumb/${code}.jpg`;
    pic.alt = nameOf(code);

    card.appendChild(pic);
    card.addEventListener('click', () => enterPlayer(idx));   // 클릭 순간에 전체화면 요청
    return card;
  }

  searchInput.addEventListener('input', () => buildGrid(searchInput.value));
  buildGrid('');

  // ---------- 재생 화면 ----------
  const CARD_W = 640, CARD_H = 330;          // 카드 이미지 원본 크기 (터치 좌표의 기준)
  let currentIndex = 0;
  let inPlayer = false;
  let wordDone = false;      // 이 카드에서 단어를 끝까지 들었는지
  let defDone = false;       // 이 카드에서 영영풀이를 끝까지 들었는지
  let motionDone = true;     // 이 카드에서 움직이는 그림(+효과음)을 끝까지 봤는지 (움직임이 없는 단어는 처음부터 true)
  let autoMode = false;      // 자동재생(예전 방식) 켜짐 여부
  let token = 0;             // 재생 세션 토큰 (끼어들기/뒤로가기 경쟁상태 방지)
  let timer = null;          // 단어→영영풀이 사이 대기
  let advanceTimer = null;   // 자동재생: 다음 단어로 넘어가기 대기
  let fsActive = false;
  let frameK = 1;            // 카드 1px(원본) = 화면 몇 px
  const viewStack = [];      // 지나온 카드 기록 (이전 버튼이 이 순서대로 되돌아감)
  const VIEW_STACK_MAX = 50;

  const setStatus = (t) => { statusPill.textContent = t; };

  // ----- 전체화면 / 가로모드 -----
  function showRotateHint() { rotateHint.classList.add('show'); }
  function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(showRotateHint);
      } else { showRotateHint(); }
    } catch (e) { showRotateHint(); }
  }
  function requestFs() {
    const el = document.documentElement;
    try {
      const fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!fn) { showRotateHint(); return; }
      const p = fn.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(lockLandscape).catch(showRotateHint);
      else lockLandscape();
    } catch (e) { showRotateHint(); }
  }
  function leaveFs() {
    fsActive = false;
    rotateHint.classList.remove('show');
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
  function onFsChange() {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (on) { fsActive = true; }
    else if (fsActive) {           // 뒤로가기 등으로 전체화면이 풀림 → 목록으로
      fsActive = false;
      if (inPlayer) exitPlayer(false);
    }
    fitCard();
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // ----- 카드 크기 맞추기 (터치 영역이 그림과 정확히 겹치도록 크기를 직접 계산) -----
  function fitCard() {
    const w = cardStage.clientWidth - 16;
    const h = cardStage.clientHeight - 16;
    if (w <= 0 || h <= 0) return;
    frameK = Math.min(w / CARD_W, h / CARD_H);
    cardFrame.style.width = Math.floor(CARD_W * frameK) + 'px';
    cardFrame.style.height = Math.floor(CARD_H * frameK) + 'px';
  }
  // 크기가 바뀌면(PC에서는 스크롤바·창 크기 변화로 자주 발생) 팝업을 닫지 않고 새 크기에 맞춰 다시 배치
  let popupEntry = null;   // 지금 떠 있는 팝업(없으면 null)
  const refitAndRepop = () => { fitCard(); if (popupEntry) showPopup(popupEntry); };
  if (window.ResizeObserver) new ResizeObserver(refitAndRepop).observe(cardStage);
  window.addEventListener('resize', refitAndRepop);
  window.addEventListener('orientationchange', () => setTimeout(fitCard, 300));

  // ----- 오디오 제어 -----
  function stopAllAudio() {
    token++;
    clearTimeout(timer); timer = null;
    clearTimeout(advanceTimer); advanceTimer = null;
    [audioW, audioD, audioR, audioS, motionVideo].forEach(a => { try { a.pause(); } catch (e) {} });
    hideMotionVisual();
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  }

  function hideMotionVisual() {
    motionVideo.classList.add('hidden');
    pulse.classList.add('hidden');
  }

  function playMp3(el, src, done, blockedMsg) {
    const my = token;
    el.onended = done;
    el.onerror = done;                       // 파일이 없어도 멈추지 않게
    el.src = src;
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(err => {
      if (my !== token) return;
      if (err && err.name === 'NotAllowedError') setStatus(blockedMsg || '👆 화면을 한 번 터치해 주세요');
      else done();
    });
  }

  function playWord() {
    stopAllAudio();
    const my = token, code = words[currentIndex];
    setStatus('단어 읽는 중...');
    playMp3(audioW, `assets/audio/${code}_w.mp3`, () => {
      if (my !== token) return;
      wordDone = true;
      afterPlay();
    }, '👆 파란 단어를 터치하면 읽어줘요');
  }

  function playDef() {
    stopAllAudio();
    const my = token, code = words[currentIndex];
    setStatus('영영풀이 읽는 중...');
    playMp3(audioD, `assets/audio/${code}_d.mp3`, () => {
      if (my !== token) return;
      defDone = true;
      markLearned(code);          // 영영풀이를 끝까지 들었으면 (단어·그림 순서와 상관없이) 오늘 학습한 단어로 기록
      afterPlay();
    }, '👆 나팔 그림을 터치하면 읽어줘요');
  }

  // 그림 움직임 + 효과음 (원본 애니메이션 영상 / 효과음만 있는 단어는 그림 둘레가 콩닥콩닥)
  function playMotion() {
    const code = words[currentIndex], m = motion[code];
    if (!m) { motionDone = true; afterPlay(); return; }
    stopAllAudio();
    const my = token;
    const done = () => {
      if (my !== token) return;
      hideMotionVisual();
      motionDone = true;
      afterPlay();
    };
    setStatus('🔊 그림이 움직여요');
    if (m.t === 'v') {
      const url = `assets/ani/${code}.mp4`;
      motionVideo.onended = done;
      motionVideo.onerror = done;
      motionVideo.onplaying = () => { if (my === token) motionVideo.classList.remove('hidden'); };
      motionVideo.muted = false;
      if (motionVideo.getAttribute('src') !== url) motionVideo.src = url;
      else { try { motionVideo.currentTime = 0; } catch (e) {} }
      const p = motionVideo.play();
      if (p && p.catch) p.catch(err => {
        if (my !== token) return;
        if (err && err.name === 'NotAllowedError') {       // 소리 재생이 막혔으면 소리 없이라도 움직이게
          motionVideo.muted = true;
          setStatus('👆 그림을 터치하면 소리가 나요');
          const p2 = motionVideo.play();
          if (p2 && p2.catch) p2.catch(done);
        } else done();
      });
    } else {
      const h = hotspots[code];
      if (h && h.p) {
        const [x, y, w, hh] = h.p;
        pulse.style.left = (x / CARD_W * 100) + '%';
        pulse.style.top = (y / CARD_H * 100) + '%';
        pulse.style.width = (w / CARD_W * 100) + '%';
        pulse.style.height = (hh / CARD_H * 100) + '%';
        pulse.classList.remove('hidden');
      }
      playMp3(audioS, `assets/sfx/${code}.mp3`, done, '👆 그림을 터치하면 소리가 나요');
    }
  }

  // 다음 영상을 미리 받아 둠 (단어가 끝나고 곧바로 재생될 수 있게)
  function prepareMotion(code) {
    const m = motion[code];
    if (m && m.t === 'v') {
      const url = `assets/ani/${code}.mp4`;
      if (motionVideo.getAttribute('src') !== url) { motionVideo.src = url; try { motionVideo.load(); } catch (e) {} }
    }
  }

  // 어떤 소리가 끝날 때마다: 단어 → (그림 움직임+효과음) → 영영풀이 순서로 아직 안 한 게 있으면 이어서, 다 했으면 "완료" 처리
  function afterPlay() {
    const my = token;
    if (!wordDone) { playWord(); return; }
    const hasMotion = !!motion[words[currentIndex]];
    if (hasMotion && !motionDone) {
      setStatus('잠시 후 그림이 움직여요...');
      timer = setTimeout(() => { if (my === token) playMotion(); }, GAP_BEFORE_MOTION_MS);
      return;
    }
    if (!defDone) {
      setStatus('잠시 후 뜻풀이...');
      timer = setTimeout(() => { if (my === token) playDef(); }, hasMotion ? GAP_AFTER_MOTION_MS : GAP_AFTER_WORD_MS);
      return;
    }
    complete();
  }

  function complete() {
    markLearned(words[currentIndex]);             // 오늘 학습한 단어로 기록
    if (autoMode) {
      setStatus('잠시 후 다음 단어로...');
      const my = token;
      const wait = popup.classList.contains('hidden') ? GAP_AFTER_DEF_MS : 5000; // 그림 팝업이 떠 있으면 조금 더 기다림
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => { if (my === token && inPlayer) goNext(); }, wait);
    } else {
      setStatus('다 읽었어요! ▶ 다음을 눌러요');
    }
  }

  // ----- 빨간 단어: 읽어주고 + 그림 팝업 -----
  function speak(text, done, fallbackCode) {
    const my = token;
    const fallback = () => {
      if (fallbackCode) playMp3(audioR, `assets/audio/${fallbackCode}_w.mp3`, done);
      else setTimeout(done, 500);
    };
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { fallback(); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
      const v = voices.find(x => /^en[-_]US/i.test(x.lang)) || voices.find(x => /^en/i.test(x.lang));
      if (v) u.voice = v;
      let fired = false;
      const fin = () => { if (fired) return; fired = true; if (my === token) done(); };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 6000);                 // 일부 기기에서 onend가 안 오는 경우 대비
      setTimeout(() => { if (my === token) speechSynthesis.speak(u); }, 60);
    } catch (e) { fallback(); }
  }

  function playRed(entry) {
    stopAllAudio();
    const my = token;
    const text = entry[0], codes = entry[5];
    setStatus(`“${text}” 읽는 중...`);
    showPopup(entry);
    const done = () => { if (my === token) afterPlay(); };
    const first = codes[0];
    const exact = first && hotspots[first] && hotspots[first].w === text;
    const rkey = text.toLowerCase().replace(/[^a-z]/g, '');
    if (exact) playMp3(audioR, `assets/audio/${first}_w.mp3`, done);              // 카드에 있는 단어 → 녹음된 발음
    else if (redAudio.has(rkey)) playMp3(audioR, `assets/audio/red/${rkey}.mp3`, done); // 복수형·활용형 등 → 녹음된 발음
    else speak(text, done, first);                                                // 녹음이 없는 것만 TTS
  }

  function hidePopup() { popupEntry = null; popup.classList.add('hidden'); popup.innerHTML = ''; }

  function showPopup(entry) {
    const codes = entry[5];
    if (!codes || !codes.length) { hidePopup(); return; }
    popup.innerHTML = '';
    const maxW = Math.min(150, CARD_W * frameK * 0.26);
    const maxH = Math.min(115, CARD_H * frameK * 0.36);
    codes.forEach(code => {
      const h = hotspots[code];
      if (!h) return;
      const p = h.p || [0, 0, CARD_W, CARD_H];
      const sc = Math.min(maxW / p[2], maxH / p[3], 2);
      const item = document.createElement('button');
      item.className = 'pop-item';
      const pic = document.createElement('div');
      pic.className = 'pop-pic';
      pic.style.width = Math.round(p[2] * sc) + 'px';
      pic.style.height = Math.round(p[3] * sc) + 'px';
      pic.style.backgroundImage = `url(assets/img/${code}.jpg)`;
      pic.style.backgroundSize = `${CARD_W * sc}px ${CARD_H * sc}px`;
      pic.style.backgroundPosition = `${-p[0] * sc}px ${-p[1] * sc}px`;
      const label = document.createElement('span');
      label.textContent = h.w + ' ▸';
      item.appendChild(pic); item.appendChild(label);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = indexOfCode.get(code);
        if (idx !== undefined) startCard(idx);      // 그 단어가 메인인 화면으로 이동
      });
      popup.appendChild(item);
    });
    if (!popup.children.length) { hidePopup(); return; }
    popupEntry = entry;
    // 위치: 누른 단어 바로 아래 (자리가 없으면 위), 카드 안쪽으로 맞춤
    popup.style.visibility = 'hidden';
    popup.classList.remove('hidden');
    const fw = cardFrame.clientWidth, fh = cardFrame.clientHeight;
    const pw = popup.offsetWidth, ph = popup.offsetHeight;
    const cx = (entry[1] + entry[3] / 2) * frameK;
    let left = Math.max(4, Math.min(cx - pw / 2, fw - pw - 4));
    let top = (entry[2] + entry[4]) * frameK + 8;
    if (top + ph > fh - 4) top = entry[2] * frameK - ph - 8;
    top = Math.max(4, Math.min(top, fh - ph - 4));
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.visibility = '';
  }

  // 팝업 바깥을 누르면 닫기
  document.addEventListener('pointerdown', (e) => {
    if (!popup.classList.contains('hidden') && !popup.contains(e.target)) hidePopup();
  }, true);

  // ----- 카드 위 터치 영역 만들기 -----
  function addHotspot(box, padX, padY, cls, label, handler) {
    let [x, y, w, h] = box;
    let x0 = Math.max(0, x - padX), y0 = Math.max(0, y - padY);
    let x1 = Math.min(CARD_W, x + w + padX), y1 = Math.min(CARD_H, y + h + padY);
    const b = document.createElement('button');
    b.className = 'hs ' + cls;
    b.setAttribute('aria-label', label);
    b.style.left = (x0 / CARD_W * 100) + '%';
    b.style.top = (y0 / CARD_H * 100) + '%';
    b.style.width = ((x1 - x0) / CARD_W * 100) + '%';
    b.style.height = ((y1 - y0) / CARD_H * 100) + '%';
    b.addEventListener('click', handler);
    hsLayer.appendChild(b);
  }

  function renderHotspots(code) {
    hsLayer.innerHTML = '';
    const h = hotspots[code];
    if (!h) return;
    if (motion[code] && h.p) addHotspot(h.p, 4, 4, 'pic', '그림 다시 보기', () => playMotion());   // 그림을 터치하면 움직임+효과음 다시
    addHotspot(h.t, 6, 6, 'blue', '단어 다시 듣기', () => playWord());
    addHotspot(h.d, 0, 3, 'def', '영영풀이 다시 듣기', () => playDef());
    h.r.forEach(entry => {
      addHotspot([entry[1], entry[2], entry[3], entry[4]], 3, 5, 'red', entry[0], () => playRed(entry));
    });
  }

  // ----- 카드 시작 / 이동 -----
  function preloadImage(code) {
    const img = new Image();
    img.src = `assets/img/${code}.jpg`;
  }

  function startCard(idx, remember = true) {
    stopAllAudio();
    hidePopup();
    // 지금 보던 카드를 기록해 둠 (다음 버튼·빨간 단어 팝업 이동 때). 이전 버튼으로 돌아갈 땐 기록하지 않음
    if (remember && idx !== currentIndex) {
      viewStack.push(currentIndex);
      if (viewStack.length > VIEW_STACK_MAX) viewStack.shift();
    }
    currentIndex = idx;
    wordDone = false;
    defDone = false;
    const code = words[idx];
    motionDone = !motion[code];
    progressLabel.textContent = `${idx + 1} / ${words.length}`;
    cardImage.src = `assets/img/${code}.jpg`;
    cardImage.alt = nameOf(code);
    renderHotspots(code);
    fitCard();
    preloadImage(words[(idx + 1) % words.length]);
    prepareMotion(code);
    playWord();
  }

  const goNext = () => { const n = (currentIndex + 1) % words.length; startCard(n); trackProgress(n); };
  // 이전: 방금 전에 보던 카드로 돌아감 (기록이 없으면 목록 순서상 바로 앞 단어)
  const goPrev = () => {
    if (viewStack.length) startCard(viewStack.pop(), false);
    else startCard((currentIndex - 1 + words.length) % words.length, false);
  };

  nextBtn.addEventListener('click', () => { goNext(); });   // 재생 중이어도 항상 눌러서 다음 단어로 넘어갈 수 있음
  prevBtn.addEventListener('click', goPrev);

  // ----- 자동재생 버튼 (켜면 예전처럼 알아서 다음 단어로) -----
  function updateAutoBtn() {
    autoBtn.classList.toggle('on', autoMode);
    autoBtn.textContent = autoMode ? '■ 자동재생 끄기' : '▶ 자동재생';
  }
  autoBtn.addEventListener('click', () => {
    autoMode = !autoMode;
    updateAutoBtn();
    if (autoMode) {
      if (wordDone && defDone) complete();      // 이미 다 읽은 상태면 바로 다음으로 진행 예약
    } else {
      clearTimeout(advanceTimer); advanceTimer = null;
      if (wordDone && defDone) setStatus('다 읽었어요! ▶ 다음을 눌러요');
      if (daily.pending) showDoneModal();
    }
  });

  // ----- 들어가기 / 나가기 -----
  function enterPlayer(idx) {
    inPlayer = true;
    autoMode = false;
    updateAutoBtn();
    requestFs();                                   // 터치한 순간 전체화면 + 가로모드 요청
    listView.classList.add('hidden');
    playerView.classList.remove('hidden');
    history.pushState({ view: 'player' }, '', '#play');
    viewStack.length = 0;
    startCard(idx, false);
    trackProgress(idx);
  }

  function exitPlayer(fromPopstate) {
    if (!inPlayer) return;
    inPlayer = false;
    stopAllAudio();
    hidePopup();
    if (daily.pending) setTimeout(showDoneModal, 150);
    playerView.classList.add('hidden');
    listView.classList.remove('hidden');
    leaveFs();
    if (!fromPopstate && location.hash === '#play') history.back();
  }

  backBtn.addEventListener('click', () => exitPlayer(false));
  window.addEventListener('popstate', () => { if (inPlayer) exitPlayer(true); });


  // ================= 오늘의 학습 목표 · My DK · 퀴즈 =================
  const myDkBtn = document.getElementById('mydk-btn');
  const goalPill = document.getElementById('goal-pill');
  const GOALS = [10, 20, 30, 40, 50];
  const QUIZ_N = 5;
  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const localKey = 'dk_daily_' + (studentId || '');
  const daily = { goal: 0, date: todayStr(), codes: [], celebrated: false, pending: false };

  (function loadDaily() {
    let loc = null;
    try { loc = JSON.parse(localStorage.getItem(localKey) || 'null'); } catch (e) {}
    const t = todayStr(), p = prog || {};
    daily.goal = GOALS.includes(p.dailyGoal) ? p.dailyGoal : (loc && GOALS.includes(loc.goal) ? loc.goal : 0);
    const set = new Set();
    if (p.todayDate === t && Array.isArray(p.todayCodes)) p.todayCodes.forEach(c => set.add(c));
    if (loc && loc.date === t && Array.isArray(loc.codes)) loc.codes.forEach(c => set.add(c));
    daily.codes = [...set].filter(c => indexOfCode.has(c));
    daily.celebrated = p.celebratedDate === t || !!(loc && loc.date === t && loc.celebrated);
  })();

  function saveDaily(extra) {
    queueSave(Object.assign({
      dailyGoal: daily.goal, todayDate: daily.date, todayCodes: daily.codes.slice(),
      celebratedDate: daily.celebrated ? daily.date : '',
    }, extra || {}));
    try { localStorage.setItem(localKey, JSON.stringify({ goal: daily.goal, date: daily.date, codes: daily.codes, celebrated: daily.celebrated })); } catch (e) {}
  }
  function rollDay() {
    const t = todayStr();
    if (daily.date !== t) { daily.date = t; daily.codes = []; daily.celebrated = false; }
  }
  function updateMyDkBtn() {
    rollDay();
    myDkBtn.innerHTML = '<span class="mydk-t">My DK</span>'
      + (daily.goal ? '<span class="mydk-c">' + Math.min(daily.codes.length, daily.goal) + '/' + daily.goal + '</span>' : '');
    // 단어 학습 화면 상단의 오늘 학습 개수 표시 (보기만 할 뿐, 자동재생에는 영향 없음)
    if (!daily.goal) goalPill.classList.add('hidden');
    else {
      const done = daily.codes.length >= daily.goal;
      goalPill.classList.remove('hidden');
      goalPill.classList.toggle('done', done);
      goalPill.textContent = '오늘 ' + Math.min(daily.codes.length, daily.goal) + '/' + daily.goal + (done ? ' ✓' : '');
    }
  }
  updateMyDkBtn();

  // 카드 하나를 끝까지 학습하면(단어→영영풀이까지) 오늘 학습한 단어로 기록
  function markLearned(code) {
    rollDay();
    if (!daily.codes.includes(code)) { daily.codes.push(code); saveDaily(); }
    updateMyDkBtn();
    if (daily.goal && !daily.celebrated && daily.codes.length >= daily.goal) {
      daily.celebrated = true; saveDaily();
      // 자동재생 중에는 끊지 않고 계속 재생 → 자동재생을 끄거나 목록으로 나갈 때 안내를 띄움
      if (inPlayer && autoMode) daily.pending = true; else showDoneModal();
    }
  }

  // ----- 공통 팝업 틀 -----
  function makeOverlay() {
    const ov = document.createElement('div');
    ov.className = 'dk-ov';
    document.body.appendChild(ov);
    return ov;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function goalChips(current, onPick) {
    const wrap = el('div', 'dk-chips');
    GOALS.forEach(g => {
      const b = el('button', 'dk-chip' + (g === current ? ' on' : ''), g + '개');
      b.type = 'button';
      b.addEventListener('click', () => {
        wrap.querySelectorAll('.dk-chip').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        onPick(g);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  // 처음 한 번: 하루 목표 고르기 (고를 때까지 닫을 수 없음)
  function askGoalIfNeeded() {
    if (daily.goal) return;
    const ov = makeOverlay();
    const box = el('div', 'dk-box');
    box.appendChild(el('p', 'dk-title', '하루에 몇 단어씩 학습할 계획이에요?'));
    box.appendChild(el('p', 'dk-sub', '나중에 오른쪽 위 My DK에서 바꿀 수 있어요'));
    let sel = 0;
    const ok = el('button', 'dk-btn', '확인');
    ok.disabled = true;
    box.appendChild(goalChips(0, g => { sel = g; ok.disabled = false; }));
    ok.addEventListener('click', () => {
      if (!sel) return;
      daily.goal = sel; saveDaily(); updateMyDkBtn(); ov.remove();
    });
    box.appendChild(ok);
    ov.appendChild(box);
  }

  // 퀴즈 게임용 묶음 (글자 구간). 마지막에 전체 랜덤 추가
  const GAME_RANGES = [['A', 'B'], ['C', 'C'], ['D', 'F'], ['G', 'K'], ['L', 'O'], ['P', 'R'], ['S', 'S'], ['T', 'Z']];
  function buildGameGroups() {
    const first = (c) => (nameOf(c)[0] || '?').toUpperCase();
    const groups = GAME_RANGES.map(([a, b]) => ({
      label: a === b ? a : a + '~' + b,
      codes: words.filter(c => { const L = first(c); return L >= a && L <= b; }),
    }));
    groups.push({ label: '전체 랜덤', codes: words.slice() });
    return groups;
  }
  const gameGroups = buildGameGroups();

  // My DK 창: 사이클(수정 불가) · 하루 학습 단어(수정) · 오늘 진행 · Game
  function openMyDk() {
    rollDay();
    const ov = makeOverlay();
    const box = el('div', 'dk-box dk-left');
    ov.appendChild(box);
    let editing = false;

    function render() {
      rollDay();
      box.innerHTML = '';
      const close = el('button', 'dk-x', '✕');
      close.addEventListener('click', () => ov.remove());
      box.appendChild(close);

      // 1) My DK Cycle
      const r1 = el('div', 'dk-row');
      r1.appendChild(el('span', 'dk-label', 'My DK Cycle'));
      r1.appendChild(el('span', 'dk-value', (prog && typeof prog.cycle === 'number' ? prog.cycle : '-') + ' cycles'));
      box.appendChild(r1);
      box.appendChild(el('p', 'dk-small', '수정을 원하면 관리자에게 문의하세요'));

      // 2) 하루 학습 단어
      const r2 = el('div', 'dk-row');
      r2.appendChild(el('span', 'dk-label', '하루 학습 단어 :'));
      if (!editing) {
        r2.appendChild(el('span', 'dk-value', daily.goal + '단어'));
        const eb = el('button', 'dk-mini', '수정');
        eb.addEventListener('click', () => { editing = true; render(); });
        r2.appendChild(eb);
        box.appendChild(r2);
      } else {
        box.appendChild(r2);
        const er = el('div', 'dk-row dk-edit');
        const sel = el('select', 'dk-select');
        GOALS.forEach(g => { const o = el('option', null, g + '단어'); o.value = g; if (g === daily.goal) o.selected = true; sel.appendChild(o); });
        const okb = el('button', 'dk-mini on', '확인');
        okb.addEventListener('click', () => {
          daily.goal = Number(sel.value); saveDaily(); updateMyDkBtn(); editing = false; render();
        });
        const cb = el('button', 'dk-mini', '취소');
        cb.addEventListener('click', () => { editing = false; render(); });
        er.appendChild(sel); er.appendChild(okb); er.appendChild(cb);
        box.appendChild(er);
      }

      // 오늘 진행 + (목표 달성 시) 오늘 퀴즈
      const n = daily.codes.length, g = daily.goal;
      box.appendChild(el('p', 'dk-sub', `오늘 학습한 단어 ${n}개 / 목표 ${g}개`));
      const bar = el('div', 'dk-bar'); const fill = el('i'); bar.appendChild(fill);
      fill.style.width = Math.min(100, g ? n / g * 100 : 0) + '%';
      box.appendChild(bar);
      if (g && n >= g) {
        const qb = el('button', 'dk-btn', '오늘 퀴즈 풀러 가기');
        qb.addEventListener('click', () => { ov.remove(); startQuiz(daily.codes.slice(), true); });
        box.appendChild(qb);
      }

      // 3) Game
      box.appendChild(el('div', 'dk-hr'));
      box.appendChild(el('p', 'dk-label', 'Game'));
      const gr = el('div', 'dk-row dk-edit');
      const gs = el('select', 'dk-select');
      gameGroups.forEach((gp, i) => { const o = el('option', null, `${gp.label}  (${gp.codes.length}단어)`); o.value = i; gs.appendChild(o); });
      gs.value = String(gameSel);
      gs.addEventListener('change', () => { gameSel = Number(gs.value); });
      const gb = el('button', 'dk-mini on', '게임 시작');
      gb.addEventListener('click', () => { ov.remove(); startQuiz(gameGroups[Number(gs.value)].codes.slice(), false); });
      gr.appendChild(gs); gr.appendChild(gb);
      box.appendChild(gr);
    }
    render();
  }
  let gameSel = 0;
  myDkBtn.addEventListener('click', openMyDk);
  goalPill.addEventListener('click', () => { if (daily.goal && daily.codes.length >= daily.goal) showDoneModal(); });

  // 목표를 채웠을 때 나오는 안내
  function showDoneModal() {
    daily.pending = false;
    stopAllAudio();
    const ov = makeOverlay();
    const box = el('div', 'dk-box');
    box.appendChild(el('div', 'dk-emoji', '🎉'));
    box.appendChild(el('p', 'dk-title', '오늘 학습 완료!'));
    box.appendChild(el('p', 'dk-sub', `오늘 ${daily.codes.length}개 단어를 학습했어요`));
    const go = el('button', 'dk-btn', '퀴즈 풀러 가기');
    go.addEventListener('click', () => { ov.remove(); startQuiz(daily.codes.slice(), true); });
    const later = el('button', 'dk-btn ghost', '나중에 할게요');
    later.addEventListener('click', () => ov.remove());
    box.appendChild(go); box.appendChild(later);
    ov.appendChild(box);
  }

  // ----- 퀴즈 문제 만들기 -----
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const HOMO = [['right', 'write'], ['sea', 'see'], ['read', 'red'], ['flour', 'flower'], ['meet', 'meat'], ['pair', 'pear'],
    ['night', 'knight'], ['hair', 'hare'], ['deer', 'dear'], ['tail', 'tale'], ['bee', 'be'], ['rose', 'rows'], ['sew', 'so'],
    ['one', 'won'], ['eye', 'i'], ['tea', 'tee'], ['hole', 'whole'], ['wood', 'would'], ['whale', 'wail'], ['wait', 'weight']];
  const sameSound = (a, b) => { a = a.toLowerCase(); b = b.toLowerCase(); return HOMO.some(g => g.includes(a) && g.includes(b)); };
  const LET = 'abcdefghijklmnopqrstuvwxyz'.split('');

  function spellQ(code) {
    const w = nameOf(code);
    if (!/^[a-z]{3,}$/i.test(w)) return null;
    const lw = w.toLowerCase();
    const len = lw.length <= 4 ? 1 : (Math.random() < 0.5 ? 1 : 2);
    const start = 1 + Math.floor(Math.random() * (lw.length - len));    // 첫 글자는 남겨둠
    const ans = lw.substr(start, len);
    const isV = (c) => 'aeiou'.includes(c);
    const similar = (c) => pick((isV(c) ? 'aeiou' : 'bcdfghjklmnpqrstvwxyz').split('').filter(x => x !== c));
    const opts = new Set([ans]);
    for (let g = 0; opts.size < 4 && g < 80; g++) {
      let d;
      if (len === 1) d = Math.random() < 0.7 ? similar(ans) : pick(LET);
      else {
        const r = Math.random();
        if (r < 0.3 && ans[0] !== ans[1]) d = ans[1] + ans[0];
        else if (r < 0.65) d = similar(ans[0]) + ans[1];
        else d = ans[0] + similar(ans[1]);
      }
      opts.add(d);
    }
    return { type: 'spell', code, word: lw, start, len, ans, opts: shuffle([...opts]) };
  }

  function listenQ(code) {
    const w = nameOf(code);
    const all = [...new Set(words.map(nameOf))].filter(n => n.toLowerCase() !== w.toLowerCase() && !sameSound(n, w));
    const near = shuffle(all.filter(n => Math.abs(n.length - w.length) <= 2));
    const ds = [];
    const sameFirst = near.find(n => n[0].toLowerCase() === w[0].toLowerCase());
    if (sameFirst) ds.push(sameFirst);
    for (const n of near.concat(shuffle(all))) { if (ds.length >= 3) break; if (!ds.includes(n)) ds.push(n); }
    return { type: 'listen', code, ans: w, opts: shuffle([w, ...ds]) };
  }

  let redPool = null;
  function redQ(code) {
    const h = hotspots[code];
    if (!h || !h.r || !h.r.length) return null;
    if (!redPool) redPool = [...new Set(Object.values(hotspots).flatMap(v => (v.r || []).map(e => e[0])))];
    const ent = pick(h.r), text = ent[0], lt = text.toLowerCase();
    const boxes = h.r.filter(e => e[0].toLowerCase() === lt).map(e => [e[1], e[2], e[3], e[4]]);
    const own = shuffle(h.r.map(e => e[0]).filter(t => t.toLowerCase() !== lt));
    const ds = own.slice(0, 1);
    const far = shuffle(redPool.filter(t => t.toLowerCase() !== lt && Math.abs(t.length - text.length) <= 3));
    for (const t of far) { if (ds.length >= 3) break; if (!ds.some(x => x.toLowerCase() === t.toLowerCase())) ds.push(t); }
    return { type: 'red', code, ans: text, boxes, opts: shuffle([text, ...ds]) };
  }

  function buildQuiz(poolCodes) {
    const pool = shuffle(poolCodes.slice());
    const qs = [], used = {};
    for (let i = 0; i < QUIZ_N; i++) {
      const code = pool[i % pool.length];
      let q = null;
      for (const t of shuffle(['spell', 'listen', 'red'])) {
        if ((used[code] || []).includes(t)) continue;
        q = t === 'spell' ? spellQ(code) : t === 'listen' ? listenQ(code) : redQ(code);
        if (q) { (used[code] = used[code] || []).push(t); break; }
      }
      qs.push(q || listenQ(code));
    }
    return qs;
  }

  // ----- 퀴즈 화면 -----
  function startQuiz(pool, saveResult) {
    if (!pool || !pool.length) return;
    stopAllAudio(); autoMode = false; updateAutoBtn(); clearTimeout(advanceTimer); advanceTimer = null;
    const qa = new Audio();
    const playQ = (src) => { try { qa.pause(); qa.src = src; qa.currentTime = 0; const p = qa.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    const ov = makeOverlay(); ov.classList.add('quiz');
    const qs = buildQuiz(pool);
    let qi = 0, score = 0;
    const closeQuiz = () => { try { qa.pause(); } catch (e) {} ov.remove(); };

    function speaker(src, big) {
      const b = el('button', 'qz-spk' + (big ? ' big' : ''), '🔊');
      b.type = 'button'; b.setAttribute('aria-label', '다시 듣기');
      b.addEventListener('click', () => playQ(src));
      return b;
    }

    function render() {
      ov.innerHTML = '';
      const q = qs[qi];
      const box = el('div', 'qz');
      const head = el('div', 'qz-head');
      head.appendChild(el('span', 'qz-num', `퀴즈 ${qi + 1} / ${qs.length}`));
      const x = el('button', 'dk-x qz-x', '✕'); x.addEventListener('click', closeQuiz);
      head.appendChild(x);
      box.appendChild(head);

      const msg = el('p', 'qz-msg');
      const next = el('button', 'dk-btn hidden', qi === qs.length - 1 ? '결과 보기' : '다음 ▶');
      next.addEventListener('click', () => { qi++; qi < qs.length ? render() : finish(); });
      let locked = false;

      function onPick(btn, val, ok, reveal) {
        if (locked) return; locked = true;
        optBtns.forEach(b => { b.disabled = true; if (b.dataset.v === q.ans) b.classList.add('ok'); });
        if (ok) { score++; msg.textContent = '정답이에요! 👏'; msg.className = 'qz-msg good'; }
        else { btn.classList.add('no'); msg.textContent = `아쉬워요! 정답은 "${q.ans}"`; msg.className = 'qz-msg bad'; }
        if (reveal) reveal();
        next.classList.remove('hidden');
      }

      const optBtns = [];
      const opts = el('div', 'qz-opts ' + (q.type === 'spell' ? 'row' : 'grid'));
      q.opts.forEach(v => {
        const b = el('button', 'qz-opt', v);
        b.type = 'button'; b.dataset.v = v;
        b.addEventListener('click', () => onPick(b, v, v === q.ans, q.type === 'spell' ? fillBlank : null));
        optBtns.push(b); opts.appendChild(b);
      });

      let fillBlank = null;
      if (q.type === 'spell') {
        box.appendChild(el('p', 'qz-q', '빈칸에 들어갈 철자를 골라요'));
        const img = el('img', 'qz-thumb'); img.src = `assets/thumb/${q.code}.jpg`; img.alt = ''; img.draggable = false;
        box.appendChild(img);
        const wd = el('div', 'qz-word');
        const slot = el('span', 'qz-blank', '');
        slot.style.minWidth = (q.len * 0.8 + 0.4) + 'em';
        for (let i = 0; i < q.word.length; i++) {
          if (i === q.start) { wd.appendChild(slot); i += q.len - 1; }
          else wd.appendChild(el('span', 'qz-l', q.word[i]));
        }
        fillBlank = () => { slot.textContent = q.ans; slot.classList.add('filled'); };
        box.appendChild(wd);
        box.appendChild(speaker(`assets/audio/${q.code}_w.mp3`, false));
        setTimeout(() => playQ(`assets/audio/${q.code}_w.mp3`), 250);
      } else if (q.type === 'listen') {
        box.appendChild(el('p', 'qz-q', '소리를 듣고 알맞은 단어를 골라요'));
        box.appendChild(speaker(`assets/audio/${q.code}_w.mp3`, true));
        setTimeout(() => playQ(`assets/audio/${q.code}_w.mp3`), 250);
      } else {
        box.appendChild(el('p', 'qz-q', '영영풀이를 듣고, 가려진 빨간 단어를 골라요'));
        const card = el('div', 'qz-card');
        const img = el('img'); img.src = `assets/img/${q.code}.jpg`; img.alt = ''; img.draggable = false;
        card.appendChild(img);
        q.boxes.forEach(([x0, y0, w0, h0]) => {
          const m = el('div', 'qz-mask');
          const px = 3, py = 4;
          m.style.left = ((x0 - px) / CARD_W * 100) + '%';
          m.style.top = ((y0 - py) / CARD_H * 100) + '%';
          m.style.width = ((w0 + px * 2) / CARD_W * 100) + '%';
          m.style.height = ((h0 + py * 2) / CARD_H * 100) + '%';
          m.textContent = '?';
          card.appendChild(m);
        });
        box.appendChild(card);
        box.appendChild(speaker(`assets/audio/${q.code}_d.mp3`, false));
        fillBlank = null;
        const revealMasks = () => card.querySelectorAll('.qz-mask').forEach(m => m.remove());
        optBtns.forEach(b => b.addEventListener('click', revealMasks));
        setTimeout(() => playQ(`assets/audio/${q.code}_d.mp3`), 250);
      }
      box.appendChild(opts);
      box.appendChild(msg);
      box.appendChild(next);
      ov.appendChild(box);
    }

    function finish() {
      try { qa.pause(); } catch (e) {}
      if (saveResult) saveDaily({ quizScore: score, quizTotal: qs.length, quizDate: todayStr() });   // 오늘 학습 퀴즈의 가장 최근 결과만 관리자에게 저장 (Game은 저장 안 함)
      ov.innerHTML = '';
      const box = el('div', 'qz res');
      box.appendChild(el('div', 'dk-emoji', score >= 4 ? '🏆' : score >= 2 ? '👍' : '💪'));
      box.appendChild(el('p', 'dk-title', `${qs.length}문제 중 ${score}개 맞혔어요!`));
      const again = el('button', 'dk-btn', '다시 풀기');
      again.addEventListener('click', () => { ov.remove(); startQuiz(pool, saveResult); });
      const done = el('button', 'dk-btn ghost', '닫기');
      done.addEventListener('click', closeQuiz);
      box.appendChild(again); box.appendChild(done);
      ov.appendChild(box);
    }
    render();
  }

  askCycleIfNeeded().then(askGoalIfNeeded);

})();
