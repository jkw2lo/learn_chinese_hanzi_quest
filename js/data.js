/* Hanzi Quest — curriculum data.
   Each entry: c=character, p=pinyin, m=meaning, comp=components,
   story=mnemonic, words=[[word,pinyin,meaning]], sent=[zh,pinyin,en] */
/* Lives here rather than in app.js because srs.js needs it too, and srs.js is
   loaded without app.js by the smoke harness. One binding, one owner. */
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

const HQ = [];
HQ.push(
{c:"一",p:"yī",m:"one",comp:[],story:"One finger, laid flat. The simplest character in the language — and your first.",words:[["一个","yí gè","one (of something)"],["第一","dì yī","first"],["一天","yì tiān","one day"]],sent:["我有一个哥哥。","Wǒ yǒu yí gè gēge.","I have one older brother."]},
{c:"二",p:"èr",m:"two",comp:["一"],story:"Two fingers. The bottom line is longer — the pair is resting on a shelf.",words:[["二月","èr yuè","February"],["第二","dì èr","second"]],sent:["我有二十块钱。","Wǒ yǒu èrshí kuài qián.","I have twenty yuan."]},
{c:"三",p:"sān",m:"three",comp:["一","二"],story:"Three fingers. One, two, three — the counting is literal, then it stops.",words:[["三月","sān yuè","March"],["第三","dì sān","third"]],sent:["三个人。","Sān gè rén.","Three people."]},
{c:"十",p:"shí",m:"ten",comp:["一"],story:"A cross — ten fingers meeting at the middle. Also why 十 means 'complete'.",words:[["十月","shí yuè","October"],["十分","shí fēn","very; extremely"]],sent:["我们十个人。","Wǒmen shí gè rén.","There are ten of us."]},
{c:"人",p:"rén",m:"person",comp:[],story:"A person walking — two legs mid-stride. Squint and you'll see them forever.",words:[["人们","rénmen","people"],["大人","dàrén","adult"],["中国人","Zhōngguórén","Chinese person"]],sent:["那个人很好。","Nàge rén hěn hǎo.","That person is very nice."]},
{c:"大",p:"dà",m:"big",comp:["人","一"],story:"A person (人) stretching their arms wide: THIS big.",words:[["大人","dàrén","adult"],["大学","dàxué","university"],["大小","dàxiǎo","size"]],sent:["这个很大。","Zhège hěn dà.","This one is big."]},
{c:"小",p:"xiǎo",m:"small",comp:[],story:"Something tiny in the middle, with two little specks flaking off it.",words:[["小心","xiǎoxīn","be careful"],["小学","xiǎoxué","primary school"],["小时","xiǎoshí","hour"]],sent:["我的手很小。","Wǒ de shǒu hěn xiǎo.","My hands are small."]},
{c:"上",p:"shàng",m:"up; above; to go to",comp:["一"],story:"A mark sitting ON TOP of the ground line. Above.",words:[["上面","shàngmiàn","above; on top"],["早上","zǎoshang","morning"],["上班","shàngbān","go to work"]],sent:["书在桌子上面。","Shū zài zhuōzi shàngmiàn.","The book is on the table."]},
{c:"下",p:"xià",m:"down; below; next",comp:["一"],story:"The mirror of 上 — a mark hanging BELOW the line. Below.",words:[["下面","xiàmiàn","below; under"],["下午","xiàwǔ","afternoon"],["一下","yíxià","(do something) briefly"]],sent:["猫在下面。","Māo zài xiàmiàn.","The cat is underneath."]},
{c:"中",p:"zhōng",m:"middle; China",comp:["口","一"],story:"An arrow straight through the centre of a target. Dead middle.",words:[["中国","Zhōngguó","China"],["中午","zhōngwǔ","noon"],["中心","zhōngxīn","centre"]],sent:["我是中国人。","Wǒ shì Zhōngguórén.","I am Chinese."]},
{c:"日",p:"rì",m:"sun; day",comp:[],story:"A drawing of the sun. The circle got squared off by centuries of brush strokes — the dot in the middle survived as a line.",words:[["日本","Rìběn","Japan"],["生日","shēngrì","birthday"],["今日","jīnrì","today"]],sent:["今天是我的生日。","Jīntiān shì wǒ de shēngrì.","Today is my birthday."]},
{c:"月",p:"yuè",m:"moon; month",comp:[],story:"A crescent moon lying on its side. Months are moons — that's true in most languages.",words:[["月亮","yuèliang","the moon"],["一月","yī yuè","January"],["月份","yuèfèn","month"]],sent:["三月有三十一天。","Sān yuè yǒu sānshíyī tiān.","March has thirty-one days."]},
{c:"山",p:"shān",m:"mountain",comp:[],story:"Three peaks on the horizon. One tall in the middle, two shoulders.",words:[["火山","huǒshān","volcano"],["山水","shānshuǐ","landscape"],["上山","shàngshān","go up a mountain"]],sent:["那座山很大。","Nà zuò shān hěn dà.","That mountain is huge."]},
{c:"水",p:"shuǐ",m:"water",comp:[],story:"A stream with currents splashing off both banks. As a side-radical it squeezes into 氵 — three drops.",words:[["水果","shuǐguǒ","fruit"],["喝水","hē shuǐ","drink water"],["开水","kāishuǐ","boiled water"]],sent:["我要喝水。","Wǒ yào hē shuǐ.","I want to drink water."]},
{c:"火",p:"huǒ",m:"fire",comp:["人"],story:"A person with sparks flying off both shoulders — or just a campfire throwing embers.",words:[["火车","huǒchē","train (fire vehicle)"],["火山","huǒshān","volcano"],["着火","zháohuǒ","catch fire"]],sent:["火很大。","Huǒ hěn dà.","The fire is big."]},
{c:"木",p:"mù",m:"tree; wood",comp:["十"],story:"A tree: trunk, branches reaching up, roots spreading down. Put two together and you get a wood (林); three and you get a forest (森).",words:[["木头","mùtou","wood; log"],["树木","shùmù","trees"]],sent:["这是木头做的。","Zhè shì mùtou zuò de.","This is made of wood."]},
{c:"口",p:"kǒu",m:"mouth; opening",comp:[],story:"An open mouth, drawn as a square. It shows up in almost every character about eating, speaking or shouting.",words:[["人口","rénkǒu","population"],["门口","ménkǒu","doorway"],["出口","chūkǒu","exit"]],sent:["门口有一个人。","Ménkǒu yǒu yí gè rén.","There's someone in the doorway."]},
{c:"目",p:"mù",m:"eye",comp:[],story:"An eye stood on its end. It resembles 日 with an extra lid-line, though the two are unrelated — an eye has more layers than the sun.",words:[["目前","mùqián","at present"],["题目","tímù","topic; question"]],sent:["他的目的很清楚。","Tā de mùdì hěn qīngchu.","His purpose is very clear."]},
{c:"手",p:"shǒu",m:"hand",comp:[],story:"A hand with fingers splayed and a wrist curving off. As a radical it flattens to 扌.",words:[["手机","shǒujī","mobile phone"],["手表","shǒubiǎo","wristwatch"],["左手","zuǒshǒu","left hand"]],sent:["我的手机在哪里？","Wǒ de shǒujī zài nǎlǐ?","Where is my phone?"]},
{c:"心",p:"xīn",m:"heart; mind",comp:[],story:"A heart with three beats flying out of it. In Chinese the heart does the thinking too — so it's inside 想 (think) and 爱 (love).",words:[["小心","xiǎoxīn","be careful"],["开心","kāixīn","happy"],["中心","zhōngxīn","centre"]],sent:["我很开心。","Wǒ hěn kāixīn.","I'm very happy."]}
);
HQ.push(
{c:"女",p:"nǚ",m:"woman; female",comp:[],story:"A figure kneeling with arms crossed — the ancient posture of a seated woman. It starts a huge family of characters.",words:[["女人","nǚrén","woman"],["女儿","nǚ'ér","daughter"],["女生","nǚshēng","female student"]],sent:["那个女人是我妈妈。","Nàge nǚrén shì wǒ māma.","That woman is my mother."]},
{c:"子",p:"zǐ",m:"child; son",comp:[],story:"A swaddled baby: big head, arms out, legs wrapped together in a blanket.",words:[["孩子","háizi","child"],["儿子","érzi","son"],["桌子","zhuōzi","table"]],sent:["他有两个孩子。","Tā yǒu liǎng gè háizi.","He has two children."]},
{c:"好",p:"hǎo",m:"good; well",comp:["女","子"],story:"A woman (女) with her child (子) — in the old world, that was the picture of things going well. 女 + 子 = good.",words:[["你好","nǐ hǎo","hello"],["好吃","hǎochī","tasty"],["好看","hǎokàn","good-looking"]],sent:["这个菜很好吃。","Zhège cài hěn hǎochī.","This dish is delicious."]},
{c:"我",p:"wǒ",m:"I; me",comp:["手"],story:"Originally a hand (手) gripping a serrated weapon — 'the one holding the blade' became 'me'. Self-defence, literally.",words:[["我们","wǒmen","we; us"],["我的","wǒ de","my; mine"]],sent:["我是学生。","Wǒ shì xuésheng.","I am a student."]},
{c:"你",p:"nǐ",m:"you",comp:["人"],story:"A person (亻, the squeezed form of 人) standing opposite you. The person facing me = you.",words:[["你好","nǐ hǎo","hello"],["你们","nǐmen","you (plural)"],["你的","nǐ de","your"]],sent:["你是老师吗？","Nǐ shì lǎoshī ma?","Are you a teacher?"]},
{c:"他",p:"tā",m:"he; him",comp:["人"],story:"A person (亻) plus 也 — 'that other person over there'. Same sound as 她, different person-shape.",words:[["他们","tāmen","they (m.)"],["他的","tā de","his"],["其他","qítā","other"]],sent:["他是我的朋友。","Tā shì wǒ de péngyou.","He is my friend."]},
{c:"她",p:"tā",m:"she; her",comp:["女"],story:"Swap the person-radical for the woman-radical (女) and 他 becomes 她. Identical sound — you can only tell them apart in writing.",words:[["她们","tāmen","they (f.)"],["她的","tā de","her"]],sent:["她很喜欢看书。","Tā hěn xǐhuan kàn shū.","She really likes reading."]},
{c:"们",p:"men",m:"(plural marker for people)",comp:["人","门"],story:"A person (亻) at a gate (门) — a crowd coming through. Stick it on any person-word to make it plural: 我们, 你们, 他们.",words:[["我们","wǒmen","we"],["人们","rénmen","people"],["同学们","tóngxuémen","classmates"]],sent:["我们都是朋友。","Wǒmen dōu shì péngyou.","We are all friends."]},
{c:"马",p:"mǎ",m:"horse",comp:[],story:"A galloping horse — the mane on top, the legs as the sweeping hook below. Learn it now: it powers a whole family of characters.",words:[["马上","mǎshàng","immediately (on a horse)"],["马路","mǎlù","road"]],sent:["我马上就来。","Wǒ mǎshàng jiù lái.","I'm coming right away."]},
{c:"吗",p:"ma",m:"(yes/no question marker)",comp:["口","马"],story:"A mouth (口) plus a horse (马) for the sound. The mouth tells you it's spoken; the horse tells you it rhymes with mǎ. Stick 吗 on a statement and it becomes a question.",words:[["好吗","hǎo ma","OK?"],["是吗","shì ma","really?"]],sent:["你好吗？","Nǐ hǎo ma?","How are you?"]},
{c:"不",p:"bù",m:"not; no",comp:["一"],story:"A bird flying up into a ceiling it can't pass. Blocked — no.",words:[["不是","bú shì","is not"],["不好","bù hǎo","not good"],["不要","bú yào","don't want"]],sent:["我不是学生。","Wǒ bú shì xuésheng.","I'm not a student."]},
{c:"是",p:"shì",m:"to be; yes; correct",comp:["日"],story:"The sun (日) above a measuring standard — what the sun shines on is what IS. The most common verb in Chinese.",words:[["是的","shì de","yes"],["不是","bú shì","is not"],["但是","dànshì","but"]],sent:["这是我的书。","Zhè shì wǒ de shū.","This is my book."]},
{c:"的",p:"de",m:"(possessive / descriptive marker)",comp:["白"],story:"The single most frequent character in written Chinese. It glues a describer to a noun: 我的书 = my book, 大的 = the big one.",words:[["我的","wǒ de","my"],["好的","hǎo de","OK; alright"],["真的","zhēn de","really"]],sent:["这是她的手机。","Zhè shì tā de shǒujī.","This is her phone."]},
{c:"了",p:"le",m:"(completed action marker)",comp:[],story:"A single hooked stroke — a swaddled baby with its arms tucked in. Put 了 after a verb and the action is done: 吃了 = ate.",words:[["好了","hǎo le","done; ready"],["来了","lái le","(someone) has come"]],sent:["我吃了。","Wǒ chī le.","I've eaten."]},
{c:"有",p:"yǒu",m:"to have; there is",comp:["月"],story:"A hand reaching for a piece of meat (the 月 here is flesh, not moon). If it's in your hand, you have it.",words:[["没有","méiyǒu","not have"],["有名","yǒumíng","famous"],["有的","yǒude","some"]],sent:["我有两个朋友。","Wǒ yǒu liǎng gè péngyou.","I have two friends."]},
{c:"在",p:"zài",m:"at; in; to be located",comp:["土"],story:"A sprout pushing into the earth (土) — rooted somewhere. 在 answers 'where'.",words:[["现在","xiànzài","now"],["在家","zài jiā","at home"],["正在","zhèngzài","in the middle of"]],sent:["我在家。","Wǒ zài jiā.","I'm at home."]},
{c:"这",p:"zhè",m:"this",comp:["辶"],story:"The walking radical 辶 (a foot on a road) plus 文. Think: the thing right here where I'm standing.",words:[["这个","zhège","this one"],["这里","zhèlǐ","here"],["这些","zhèxiē","these"]],sent:["这个多少钱？","Zhège duōshao qián?","How much is this?"]},
{c:"那",p:"nà",m:"that",comp:[],story:"The partner of 这. This one here, that one over there — 这 vs 那.",words:[["那个","nàge","that one"],["那里","nàlǐ","there"],["那些","nàxiē","those"]],sent:["那个人是谁？","Nàge rén shì shéi?","Who is that person?"]},
{c:"个",p:"gè",m:"(general counting word)",comp:["人"],story:"Chinese counts with a measure word between the number and the noun. 个 is the universal one — when you don't know which to use, use 个.",words:[["一个","yí gè","one"],["这个","zhège","this one"],["几个","jǐ gè","how many"]],sent:["我要三个。","Wǒ yào sān gè.","I want three."]},
{c:"什",p:"shén",m:"what (in 什么)",comp:["人","十"],story:"A person (亻) plus ten (十). It only really lives in one word — 什么, 'what'.",words:[["什么","shénme","what"]],sent:["你要什么？","Nǐ yào shénme?","What do you want?"]},
{c:"么",p:"me",m:"(suffix in question words)",comp:[],story:"Three quick strokes. The tail of 什么 (what), 怎么 (how), 那么 (so).",words:[["什么","shénme","what"],["怎么","zěnme","how"],["那么","nàme","so; in that case"]],sent:["你在做什么？","Nǐ zài zuò shénme?","What are you doing?"]},
{c:"谁",p:"shéi",m:"who",comp:["讠","隹"],story:"The speech radical 讠 (a compressed 言, 'words') plus 隹, a short-tailed bird. Asking with words: who?",words:[["是谁","shì shéi","who is"],["谁的","shéi de","whose"]],sent:["这是谁的书？","Zhè shì shéi de shū?","Whose book is this?"]},
{c:"很",p:"hěn",m:"very",comp:[],story:"Chinese usually needs 很 between a subject and an adjective — 我很好 is just 'I'm fine', not 'I'm VERY fine'. It's grammatical glue as much as emphasis.",words:[["很好","hěn hǎo","very good"],["很多","hěn duō","a lot"],["很大","hěn dà","very big"]],sent:["今天很好。","Jīntiān hěn hǎo.","Today is good."]},
{c:"也",p:"yě",m:"also; too",comp:[],story:"It sits BEFORE the verb, not at the end: 我也是 = 'me too'. Same shape hiding inside 他 and 她.",words:[["也是","yě shì","also is"],["也有","yě yǒu","also has"]],sent:["我也是学生。","Wǒ yě shì xuésheng.","I'm a student too."]},
{c:"和",p:"hé",m:"and; with",comp:["口"],story:"Grain (禾) beside a mouth (口) — sharing food together. It joins nouns: 我和你 = you and I. It does not join sentences.",words:[["和平","hépíng","peace"],["我和你","wǒ hé nǐ","you and I"]],sent:["我和他是朋友。","Wǒ hé tā shì péngyou.","He and I are friends."]},
{c:"都",p:"dōu",m:"all; both",comp:["者"],story:"Like 也, it goes before the verb: 我们都是 = 'we are all'. Careful — read as dū it means 'capital city'.",words:[["都是","dōu shì","all are"],["都有","dōu yǒu","all have"]],sent:["他们都很好。","Tāmen dōu hěn hǎo.","They are all doing well."]}
);
HQ.push(
{c:"天",p:"tiān",m:"day; sky; heaven",comp:["大","一"],story:"A big person (大) with a line drawn above their head — whatever is over us all: the sky.",words:[["今天","jīntiān","today"],["天气","tiānqì","weather"],["每天","měitiān","every day"]],sent:["今天天气很好。","Jīntiān tiānqì hěn hǎo.","The weather is nice today."]},
{c:"地",p:"dì",m:"earth; ground",comp:["土","也"],story:"Soil (土) plus 也 for sound. The partner of 天 — sky above, ground below.",words:[["地方","dìfang","place"],["地图","dìtú","map"],["地上","dìshang","on the ground"]],sent:["这个地方很好。","Zhège dìfang hěn hǎo.","This place is nice."]},
{c:"年",p:"nián",m:"year",comp:["十"],story:"Originally a person carrying harvested grain — one harvest, one year.",words:[["今年","jīnnián","this year"],["去年","qùnián","last year"],["年级","niánjí","grade; year in school"]],sent:["今年我二十一岁。","Jīnnián wǒ èrshíyī suì.","I'm twenty-one this year."]},
{c:"今",p:"jīn",m:"now; present",comp:["人"],story:"A roof (from 人) covering something held in the moment. Now, under this roof.",words:[["今天","jīntiān","today"],["今年","jīnnián","this year"],["今晚","jīnwǎn","tonight"]],sent:["今天是星期一。","Jīntiān shì xīngqīyī.","Today is Monday."]},
{c:"时",p:"shí",m:"time; hour",comp:["日","寸"],story:"The sun (日) next to 寸 (a measure). Measuring the sun = telling the time.",words:[["时间","shíjiān","time"],["小时","xiǎoshí","hour"],["有时","yǒushí","sometimes"]],sent:["我没有时间。","Wǒ méiyǒu shíjiān.","I don't have time."]},
{c:"候",p:"hòu",m:"wait; time (in 时候)",comp:["人"],story:"A person (亻) standing watch. It almost always appears in 时候 — 'the time when'.",words:[["时候","shíhou","time; moment"],["什么时候","shénme shíhou","when?"],["气候","qìhòu","climate"]],sent:["你什么时候来？","Nǐ shénme shíhou lái?","When are you coming?"]},
{c:"现",p:"xiàn",m:"present; appear",comp:["王","见"],story:"Jade (王) that you can see (见) — brought out into view. Hence 'to appear' and 'the present'.",words:[["现在","xiànzài","now"],["发现","fāxiàn","discover"],["现金","xiànjīn","cash"]],sent:["我现在很忙。","Wǒ xiànzài hěn máng.","I'm busy right now."]},
{c:"去",p:"qù",m:"to go",comp:["土"],story:"Earth (土) above a container — leaving the ground behind. Away from the speaker.",words:[["去年","qùnián","last year"],["回去","huíqù","go back"],["出去","chūqù","go out"]],sent:["我要去中国。","Wǒ yào qù Zhōngguó.","I want to go to China."]},
{c:"来",p:"lái",m:"to come",comp:["木","十"],story:"Originally a wheat plant — grain that 'came' to the people. The mirror of 去: toward the speaker.",words:[["回来","huílái","come back"],["来了","lái le","has come"],["后来","hòulái","afterwards"]],sent:["他明天来。","Tā míngtiān lái.","He's coming tomorrow."]},
{c:"回",p:"huí",m:"to return",comp:["口"],story:"A mouth inside a mouth — a spiral turning back on itself. Going around and coming back.",words:[["回家","huí jiā","go home"],["回来","huílái","come back"],["回答","huídá","to answer"]],sent:["我要回家了。","Wǒ yào huí jiā le.","I'm going home now."]},
{c:"看",p:"kàn",m:"to look; to watch; to read",comp:["手","目"],story:"A hand (手) shading the eye (目) — shielding your brow to see into the distance. Perfect picture.",words:[["看书","kàn shū","read a book"],["看见","kànjiàn","to see"],["好看","hǎokàn","good-looking"]],sent:["我喜欢看电影。","Wǒ xǐhuan kàn diànyǐng.","I like watching films."]},
{c:"说",p:"shuō",m:"to speak; to say",comp:["讠","兑"],story:"The speech radical 讠 on the left — words coming out. Any character with 讠 involves talking.",words:[["说话","shuōhuà","to speak"],["小说","xiǎoshuō","novel"],["听说","tīngshuō","hear that"]],sent:["他说中文说得很好。","Tā shuō Zhōngwén shuō de hěn hǎo.","He speaks Chinese very well."]},
{c:"听",p:"tīng",m:"to listen; to hear",comp:["口","斤"],story:"A mouth (口) plus 斤 (an axe, for the sound). Odd pairing — but the 口 marks it as an ear-and-mouth business.",words:[["听说","tīngshuō","hear that"],["好听","hǎotīng","nice-sounding"],["听见","tīngjiàn","to hear"]],sent:["这首歌很好听。","Zhè shǒu gē hěn hǎotīng.","This song sounds lovely."]},
{c:"读",p:"dú",m:"to read; to study",comp:["讠"],story:"Speech radical (讠) again — because for most of history, reading meant reading ALOUD.",words:[["读书","dúshū","read; study"],["阅读","yuèdú","reading"]],sent:["我每天读中文。","Wǒ měitiān dú Zhōngwén.","I read Chinese every day."]},
{c:"写",p:"xiě",m:"to write",comp:[],story:"A roof with something being set down underneath — putting things down on paper, under cover.",words:[["写字","xiězì","write characters"],["写信","xiěxìn","write a letter"]],sent:["我在写字。","Wǒ zài xiězì.","I'm writing characters."]},
{c:"吃",p:"chī",m:"to eat",comp:["口","乞"],story:"A mouth (口) plus 乞 (to beg) — begging mouth, eating. Every eating-and-drinking word has 口.",words:[["吃饭","chīfàn","eat a meal"],["好吃","hǎochī","tasty"],["吃了","chī le","have eaten"]],sent:["你吃饭了吗？","Nǐ chīfàn le ma?","Have you eaten?"]},
{c:"喝",p:"hē",m:"to drink",comp:["口"],story:"Mouth (口) again, on the left. If you see 口 on the left edge, something is going in or out of a mouth.",words:[["喝水","hē shuǐ","drink water"],["喝茶","hē chá","drink tea"],["好喝","hǎohē","tasty (drinks)"]],sent:["我想喝水。","Wǒ xiǎng hē shuǐ.","I want to drink water."]},
{c:"做",p:"zuò",m:"to do; to make",comp:["人"],story:"A person (亻) getting on with it. The general-purpose 'do' — 做饭, 做事, 做作业.",words:[["做饭","zuòfàn","cook"],["做事","zuòshì","do work"],["做什么","zuò shénme","do what"]],sent:["你在做什么？","Nǐ zài zuò shénme?","What are you doing?"]},
{c:"走",p:"zǒu",m:"to walk; to leave",comp:["土"],story:"A person swinging their arms above a foot below. Motion on legs. It's also the root of the walking radical 辶.",words:[["走路","zǒulù","walk"],["走吧","zǒu ba","let's go"],["出走","chūzǒu","leave; run away"]],sent:["我们走吧。","Wǒmen zǒu ba.","Let's go."]},
{c:"坐",p:"zuò",m:"to sit; to ride",comp:["人","土"],story:"Two people (人人) sitting on the ground (土). You also 坐 a bus or train — you sit in it.",words:[["坐下","zuòxià","sit down"],["坐车","zuòchē","take a vehicle"]],sent:["请坐。","Qǐng zuò.","Please sit down."]},
{c:"想",p:"xiǎng",m:"to think; to want; to miss",comp:["心"],story:"A heart (心) at the bottom, under 相 (to look at). Looking with your heart — thinking, wanting, missing someone.",words:[["想要","xiǎng yào","would like"],["想家","xiǎng jiā","be homesick"],["思想","sīxiǎng","thought"]],sent:["我想回家。","Wǒ xiǎng huí jiā.","I want to go home."]},
{c:"要",p:"yào",m:"to want; will; must",comp:["女"],story:"A woman (女) below, with 覀 above. It carries real weight — 要 can mean want, need, or 'is going to'.",words:[["要是","yàoshi","if"],["需要","xūyào","to need"],["不要","bú yào","don't"]],sent:["我要一杯水。","Wǒ yào yì bēi shuǐ.","I'd like a glass of water."]},
{c:"会",p:"huì",m:"can (learned skill); will; meeting",comp:["人"],story:"People (人) gathered under a roof — a meeting. It also means 'know how to': 我会说中文.",words:[["开会","kāihuì","have a meeting"],["会说","huì shuō","can speak"],["一会儿","yíhuìr","a moment"]],sent:["我会说一点中文。","Wǒ huì shuō yìdiǎn Zhōngwén.","I can speak a little Chinese."]},
{c:"能",p:"néng",m:"can; to be able",comp:[],story:"Once a picture of a bear — a creature of raw capability. 会 is skill you learned; 能 is ability or permission.",words:[["能力","nénglì","ability"],["不能","bù néng","cannot"],["可能","kěnéng","possible"]],sent:["我今天不能去。","Wǒ jīntiān bù néng qù.","I can't go today."]},
{c:"知",p:"zhī",m:"to know",comp:["口","矢"],story:"An arrow (矢) and a mouth (口) — words that fly straight to the target. That's knowing.",words:[["知道","zhīdào","to know"],["知识","zhīshi","knowledge"],["不知","bùzhī","not know"]],sent:["我不知道。","Wǒ bù zhīdào.","I don't know."]},
{c:"道",p:"dào",m:"road; way; to say",comp:["辶"],story:"The walking radical 辶 with a head (首) — a person heading down a path. Road, way, and by extension 'the Way'.",words:[["知道","zhīdào","to know"],["道理","dàolǐ","reason; principle"],["道路","dàolù","road"]],sent:["你知道他的名字吗？","Nǐ zhīdào tā de míngzi ma?","Do you know his name?"]},
{c:"学",p:"xué",m:"to study; to learn",comp:["子"],story:"A child (子) under a roof with hands reaching down to guide them. Learning, drawn literally.",words:[["学生","xuésheng","student"],["学习","xuéxí","to study"],["大学","dàxué","university"]],sent:["我在学中文。","Wǒ zài xué Zhōngwén.","I'm studying Chinese."]},
{c:"生",p:"shēng",m:"to be born; life; raw",comp:["土"],story:"A sprout breaking through the soil (土). Birth, life, growth — and 'raw' for the same reason.",words:[["学生","xuésheng","student"],["生日","shēngrì","birthday"],["先生","xiānsheng","Mr.; sir"]],sent:["他是我的学生。","Tā shì wǒ de xuésheng.","He is my student."]},
{c:"家",p:"jiā",m:"home; family",comp:["宀","豕"],story:"A roof with a pig (豕) underneath. A house with livestock in it was a household — that's a home.",words:[["回家","huí jiā","go home"],["家人","jiārén","family members"],["国家","guójiā","country"]],sent:["我家有四个人。","Wǒ jiā yǒu sì gè rén.","There are four people in my family."]},
{c:"国",p:"guó",m:"country",comp:["囗","王"],story:"A border (囗) drawn around jade (玉) — treasure inside walls. That's a country.",words:[["中国","Zhōngguó","China"],["国家","guójiā","country"],["外国","wàiguó","foreign country"]],sent:["你是哪国人？","Nǐ shì nǎ guó rén?","What country are you from?"]}
);
HQ.push(
{c:"多",p:"duō",m:"many; much",comp:[],story:"Two evenings (夕) stacked up — one night after another piling on. That's a lot.",words:[["多少","duōshao","how much/many"],["很多","hěn duō","a lot"],["多大","duō dà","how old/big"]],sent:["这里人很多。","Zhèlǐ rén hěn duō.","There are a lot of people here."]},
{c:"少",p:"shǎo",m:"few; little",comp:["小"],story:"小 (small) with one more speck falling away. Even less than small.",words:[["多少","duōshao","how much"],["很少","hěn shǎo","very few"],["少年","shàonián","youth"]],sent:["我的钱很少。","Wǒ de qián hěn shǎo.","I have very little money."]},
{c:"几",p:"jǐ",m:"how many; a few",comp:[],story:"A small table on two legs. Used for asking about small numbers — under ten. Bigger than that, use 多少.",words:[["几个","jǐ gè","how many"],["几点","jǐ diǎn","what time"],["几天","jǐ tiān","a few days"]],sent:["你要几个？","Nǐ yào jǐ gè?","How many do you want?"]},
{c:"半",p:"bàn",m:"half",comp:["八","牛"],story:"Something split straight down the middle, the two halves falling apart. 两点半 = half past two.",words:[["一半","yíbàn","a half"],["半天","bàntiān","half a day; ages"],["半年","bànnián","half a year"]],sent:["现在是两点半。","Xiànzài shì liǎng diǎn bàn.","It's half past two."]},
{c:"两",p:"liǎng",m:"two (of something)",comp:[],story:"Two identical shapes inside one frame — a matched pair. Use 两 before measure words, 二 for counting: 两个人, not 二个人.",words:[["两个","liǎng gè","two (items)"],["两天","liǎng tiān","two days"]],sent:["我有两个姐姐。","Wǒ yǒu liǎng gè jiějie.","I have two older sisters."]},
{c:"百",p:"bǎi",m:"hundred",comp:["一","白"],story:"One (一) on top of 白 (white). One full set — a hundred.",words:[["一百","yìbǎi","one hundred"],["百分","bǎifēn","percent"]],sent:["这个一百块。","Zhège yìbǎi kuài.","This is one hundred yuan."]},
{c:"千",p:"qiān",m:"thousand",comp:["十"],story:"A person with a line through them — look closely and it's 十 (ten) wearing a hat. Ten times bigger than it looks.",words:[["一千","yìqiān","one thousand"],["千万","qiānwàn","by all means; ten million"]],sent:["一千块太贵了。","Yìqiān kuài tài guì le.","A thousand yuan is too expensive."]},
{c:"万",p:"wàn",m:"ten thousand",comp:[],story:"Chinese counts in units of ten thousand, not millions. 一万 = 10,000. A million is 一百万 — a hundred 万.",words:[["一万","yíwàn","ten thousand"],["万一","wànyī","just in case"]],sent:["他有一万块钱。","Tā yǒu yíwàn kuài qián.","He has ten thousand yuan."]},
{c:"块",p:"kuài",m:"piece; (unit of money)",comp:["土"],story:"A lump of earth (土) — a chunk of something. In speech it's the everyday word for yuan: 十块钱.",words:[["一块","yíkuài","one piece; together"],["块钱","kuài qián","yuan"]],sent:["三块钱。","Sān kuài qián.","Three yuan."]},
{c:"钱",p:"qián",m:"money",comp:["钅"],story:"The metal radical 钅 on the left — money was metal first. Any character with 钅 involves metal.",words:[["多少钱","duōshao qián","how much?"],["有钱","yǒuqián","rich"],["零钱","língqián","small change"]],sent:["这个多少钱？","Zhège duōshao qián?","How much is this?"]},
{c:"买",p:"mǎi",m:"to buy",comp:[],story:"The one with the SHORT top is buying. Compare it to 卖 side by side — that extra stroke on top is the whole difference.",words:[["买东西","mǎi dōngxi","go shopping"],["买卖","mǎimai","business"]],sent:["我要买一个手机。","Wǒ yào mǎi yí gè shǒujī.","I want to buy a phone."]},
{c:"卖",p:"mài",m:"to sell",comp:["买","十"],story:"买 (buy) with 十 stacked on top — the seller stands taller, over the goods. Buy is mǎi, sell is mài: third tone in, fourth tone out.",words:[["卖东西","mài dōngxi","sell things"],["买卖","mǎimai","business"]],sent:["他们卖水果。","Tāmen mài shuǐguǒ.","They sell fruit."]},
{c:"东",p:"dōng",m:"east",comp:[],story:"The sun rising behind a tree. East is where the day starts.",words:[["东西","dōngxi","thing; stuff"],["东方","dōngfāng","the East"],["东北","dōngběi","northeast"]],sent:["我要买一些东西。","Wǒ yào mǎi yìxiē dōngxi.","I want to buy some things."]},
{c:"西",p:"xī",m:"west",comp:[],story:"A bird settling into its nest — birds roost when the sun goes west. Paired with 东 it makes 东西, 'thing'.",words:[["东西","dōngxi","thing"],["西方","xīfāng","the West"],["西瓜","xīguā","watermelon"]],sent:["这个东西很好。","Zhège dōngxi hěn hǎo.","This thing is great."]},
{c:"南",p:"nán",m:"south",comp:["十"],story:"An old bell shape. Chinese lists directions as 东南西北 — east, south, west, north.",words:[["南方","nánfāng","the South"],["南北","nánběi","north-south"]],sent:["他住在南方。","Tā zhù zài nánfāng.","He lives in the south."]},
{c:"北",p:"běi",m:"north",comp:[],story:"Two people back to back — turning their backs on the cold north wind.",words:[["北方","běifāng","the North"],["北京","Běijīng","Beijing (northern capital)"]],sent:["我去北京。","Wǒ qù Běijīng.","I'm going to Beijing."]},
{c:"里",p:"lǐ",m:"inside; in",comp:["土"],story:"A field (田) over earth (土) — the inside of a village. Goes AFTER the noun: 家里 = in the house.",words:[["这里","zhèlǐ","here"],["哪里","nǎlǐ","where"],["家里","jiālǐ","at home"]],sent:["他在家里。","Tā zài jiālǐ.","He's at home."]},
{c:"外",p:"wài",m:"outside; foreign",comp:[],story:"Evening (夕) plus divination (卜) — reading omens out of doors, after dark. The opposite of 里.",words:[["外面","wàimiàn","outside"],["外国","wàiguó","foreign"],["国外","guówài","abroad"]],sent:["外面很冷。","Wàimiàn hěn lěng.","It's cold outside."]},
{c:"前",p:"qián",m:"front; before; ago",comp:["月"],story:"Front in space AND front in time: 前面 = ahead, 以前 = before, 三年前 = three years ago.",words:[["前面","qiánmiàn","in front"],["以前","yǐqián","before"],["前天","qiántiān","day before yesterday"]],sent:["学校在前面。","Xuéxiào zài qiánmiàn.","The school is up ahead."]},
{c:"后",p:"hòu",m:"back; after; later",comp:["口"],story:"The partner of 前. 后面 = behind, 以后 = afterwards, 后天 = the day after tomorrow.",words:[["后面","hòumiàn","behind"],["以后","yǐhòu","after; later"],["然后","ránhòu","then"]],sent:["我们以后再说。","Wǒmen yǐhòu zài shuō.","Let's talk about it later."]},
{c:"左",p:"zuǒ",m:"left",comp:["工"],story:"A hand over a工 (work). 左 and 右 both start with the same hand-shape — the bottom half tells them apart.",words:[["左边","zuǒbiān","the left side"],["左右","zuǒyòu","approximately"]],sent:["在你的左边。","Zài nǐ de zuǒbiān.","It's on your left."]},
{c:"右",p:"yòu",m:"right",comp:["口"],story:"A hand over a mouth (口) — the hand you eat with. That's how to tell it from 左.",words:[["右边","yòubiān","the right side"],["左右","zuǒyòu","about; roughly"]],sent:["请往右走。","Qǐng wǎng yòu zǒu.","Please go right."]},
{c:"边",p:"biān",m:"side; edge",comp:["辶"],story:"The walking radical 辶 — the edge you travel along. Stick it after a direction: 左边, 右边, 外边.",words:[["旁边","pángbiān","beside"],["这边","zhèbiān","this side"],["上边","shàngbiān","above"]],sent:["银行在那边。","Yínháng zài nàbiān.","The bank is over there."]},
{c:"面",p:"miàn",m:"face; side; noodles",comp:[],story:"A face with an eye (目) inside it. Three jobs: face, side (上面), and noodles (面条).",words:[["上面","shàngmiàn","above"],["面条","miàntiáo","noodles"],["见面","jiànmiàn","meet"]],sent:["我想吃面条。","Wǒ xiǎng chī miàntiáo.","I want to eat noodles."]},
{c:"开",p:"kāi",m:"to open; to turn on; to drive",comp:["一"],story:"Two hands lifting the bar off a gate. Open the door, open a shop, turn on a light, start a car — all 开.",words:[["开车","kāichē","drive"],["开门","kāimén","open the door"],["开始","kāishǐ","begin"]],sent:["请开门。","Qǐng kāimén.","Please open the door."]},
{c:"关",p:"guān",m:"to close; to turn off",comp:[],story:"The opposite of 开 — the bar goes back across the gate. 关门, 关灯, 关机.",words:[["关门","guānmén","close the door"],["关系","guānxi","relationship"],["没关系","méi guānxi","it doesn't matter"]],sent:["没关系。","Méi guānxi.","It's no problem."]},
{c:"门",p:"mén",m:"door; gate",comp:[],story:"A doorway with its frame — the simplified form of 門, which was a pair of swinging doors. It's hiding inside 们 and 问.",words:[["门口","ménkǒu","doorway"],["开门","kāimén","open the door"],["大门","dàmén","main gate"]],sent:["门开着。","Mén kāi zhe.","The door is open."]},
{c:"车",p:"chē",m:"vehicle; car",comp:[],story:"A cart seen from above: the axle running through, wheels on either side. Simplified from 車.",words:[["火车","huǒchē","train"],["汽车","qìchē","car"],["开车","kāichē","to drive"]],sent:["我坐火车去。","Wǒ zuò huǒchē qù.","I'm going by train."]},
{c:"路",p:"lù",m:"road",comp:["足"],story:"A foot radical (足) on the left plus 各. Where the feet go — the road.",words:[["马路","mǎlù","street"],["走路","zǒulù","walk"],["路上","lùshang","on the way"]],sent:["路上小心。","Lùshang xiǎoxīn.","Be careful on the way."]},
{c:"站",p:"zhàn",m:"to stand; station",comp:["立"],story:"立 (to stand) on the left. A station is where things stand still — 火车站, 车站.",words:[["车站","chēzhàn","bus/train station"],["站着","zhàn zhe","standing"]],sent:["火车站在哪里？","Huǒchēzhàn zài nǎlǐ?","Where is the train station?"]},
{c:"到",p:"dào",m:"to arrive; to reach",comp:["刀"],story:"Arriving, and also 'successfully': 看到 = saw it, 买到 = managed to buy it. Tack it onto a verb to say the action landed.",words:[["到了","dào le","arrived"],["看到","kàndào","see"],["到处","dàochù","everywhere"]],sent:["我到家了。","Wǒ dào jiā le.","I've arrived home."]},
{c:"从",p:"cóng",m:"from",comp:["人"],story:"Two people (人人) walking in single file, one following the other. Where you're coming from.",words:[["从来","cónglái","ever; always"],["自从","zìcóng","since"]],sent:["我从中国来。","Wǒ cóng Zhōngguó lái.","I come from China."]},
{c:"给",p:"gěi",m:"to give; for",comp:["纟"],story:"The silk radical 纟 — handing over cloth as a gift. 给我 = give me / for me.",words:[["给你","gěi nǐ","here you go"],["送给","sòng gěi","give as a present"]],sent:["请给我一杯水。","Qǐng gěi wǒ yì bēi shuǐ.","Please give me a glass of water."]},
{c:"对",p:"duì",m:"correct; toward",comp:["寸"],story:"Two meanings worth keeping straight: 对 = 'right, correct', and 对我说 = 'say TO me'.",words:[["对不起","duìbuqǐ","sorry"],["不对","bú duì","incorrect"],["对面","duìmiàn","opposite"]],sent:["你说得对。","Nǐ shuō de duì.","You're right."]},
{c:"请",p:"qǐng",m:"please; to invite",comp:["讠","青"],story:"Speech radical 讠 plus 青 (qīng) for the sound. 青 powers a whole family: 请 qǐng, 清 qīng, 情 qíng, 晴 qíng — same sound, different radicals.",words:[["请问","qǐngwèn","excuse me, may I ask"],["请坐","qǐng zuò","please sit"],["请客","qǐngkè","treat someone"]],sent:["请问，你叫什么名字？","Qǐngwèn, nǐ jiào shénme míngzi?","Excuse me, what's your name?"]}
);
HQ.push(
{c:"爸",p:"bà",m:"dad",comp:["父"],story:"The father radical 父 on top, 巴 (bā) underneath for the sound. Doubled up as 爸爸 — most family words come in pairs.",words:[["爸爸","bàba","dad"],["爸妈","bàmā","mum and dad"]],sent:["我爸爸是老师。","Wǒ bàba shì lǎoshī.","My dad is a teacher."]},
{c:"妈",p:"mā",m:"mum",comp:["女","马"],story:"Woman (女) + horse (马). The 女 gives the meaning, the 马 gives the sound: mǎ → mā. This is how most Chinese characters work — one half means, one half sounds.",words:[["妈妈","māma","mum"],["大妈","dàmā","auntie"]],sent:["妈妈在做饭。","Māma zài zuòfàn.","Mum is cooking."]},
{c:"哥",p:"gē",m:"older brother",comp:["可"],story:"Two 可 stacked up — an older sibling standing over a younger one. 哥哥 is your older brother specifically; Chinese never just says 'brother'.",words:[["哥哥","gēge","older brother"],["大哥","dàgē","eldest brother"]],sent:["我哥哥在北京。","Wǒ gēge zài Běijīng.","My older brother is in Beijing."]},
{c:"姐",p:"jiě",m:"older sister",comp:["女","且"],story:"Woman radical 女 again — and it'll appear in 妹 too. 姐姐 = older sister.",words:[["姐姐","jiějie","older sister"],["小姐","xiǎojiě","miss"]],sent:["我姐姐很喜欢音乐。","Wǒ jiějie hěn xǐhuan yīnyuè.","My older sister loves music."]},
{c:"弟",p:"dì",m:"younger brother",comp:[],story:"A cord wound around a stake, ranked in order — younger brothers came further down the rank.",words:[["弟弟","dìdi","younger brother"],["兄弟","xiōngdì","brothers"]],sent:["我弟弟十岁。","Wǒ dìdi shí suì.","My younger brother is ten."]},
{c:"妹",p:"mèi",m:"younger sister",comp:["女","木"],story:"Woman (女) plus 未 (not yet) — the one who hasn't grown up yet. Younger sister.",words:[["妹妹","mèimei","younger sister"],["姐妹","jiěmèi","sisters"]],sent:["我有一个妹妹。","Wǒ yǒu yí gè mèimei.","I have a younger sister."]},
{c:"朋",p:"péng",m:"friend",comp:["月"],story:"Two 月 side by side — two strings of shells hung together, or simply two people standing shoulder to shoulder.",words:[["朋友","péngyou","friend"],["好朋友","hǎo péngyou","good friend"]],sent:["他是我最好的朋友。","Tā shì wǒ zuì hǎo de péngyou.","He's my best friend."]},
{c:"友",p:"yǒu",m:"friend",comp:["又"],story:"Two hands (又) reaching toward each other. A handshake, drawn 3,000 years ago.",words:[["朋友","péngyou","friend"],["友好","yǒuhǎo","friendly"],["网友","wǎngyǒu","online friend"]],sent:["我们是好朋友。","Wǒmen shì hǎo péngyou.","We're good friends."]},
{c:"老",p:"lǎo",m:"old; venerable",comp:[],story:"A bent figure with a walking stick. Not an insult — 老 signals respect: 老师 is 'venerable teacher'.",words:[["老师","lǎoshī","teacher"],["老人","lǎorén","elderly person"],["老板","lǎobǎn","boss"]],sent:["他是我的老师。","Tā shì wǒ de lǎoshī.","He's my teacher."]},
{c:"师",p:"shī",m:"teacher; master",comp:["巾"],story:"Pairs with 老 to make 老师. Also 工程师 (engineer), 律师 (lawyer) — the 'master of a craft' suffix.",words:[["老师","lǎoshī","teacher"],["师父","shīfu","master"]],sent:["老师，请问……","Lǎoshī, qǐngwèn...","Teacher, may I ask..."]},
{c:"同",p:"tóng",m:"same; together",comp:["口"],story:"A cover over a mouth (口) — everyone speaking with one voice. Same.",words:[["同学","tóngxué","classmate"],["同事","tóngshì","colleague"],["不同","bùtóng","different"]],sent:["我们是同学。","Wǒmen shì tóngxué.","We're classmates."]},
{c:"名",p:"míng",m:"name",comp:["口","夕"],story:"Evening (夕) plus mouth (口) — in the dark you can't see who's coming, so you call out your name.",words:[["名字","míngzi","name"],["有名","yǒumíng","famous"],["名人","míngrén","celebrity"]],sent:["你的名字很好听。","Nǐ de míngzi hěn hǎotīng.","Your name is lovely."]},
{c:"字",p:"zì",m:"character; word",comp:["子"],story:"A child (子) under a roof — children born into a house get named, and the name is written. 汉字 = Chinese characters.",words:[["名字","míngzi","name"],["汉字","Hànzì","Chinese character"],["写字","xiězì","write"]],sent:["这个字怎么念？","Zhège zì zěnme niàn?","How do you pronounce this character?"]},
{c:"叫",p:"jiào",m:"to be called; to shout",comp:["口"],story:"Mouth (口) on the left — calling out. 我叫… is how you give your name: 'I am called…'.",words:[["叫做","jiàozuò","to be called"],["大叫","dàjiào","shout"]],sent:["我叫小明。","Wǒ jiào Xiǎomíng.","My name is Xiaoming."]},
{c:"住",p:"zhù",m:"to live; to reside",comp:["人","主"],story:"A person (亻) plus 主 (master) — the master of the house is the one who lives there.",words:[["住在","zhù zài","live in"],["住处","zhùchù","residence"]],sent:["我住在上海。","Wǒ zhù zài Shànghǎi.","I live in Shanghai."]},
{c:"工",p:"gōng",m:"work; labour",comp:[],story:"A carpenter's tool — a ruler or chisel. It's also the sound-part of 左 and 红.",words:[["工作","gōngzuò","work; job"],["工人","gōngrén","worker"],["工厂","gōngchǎng","factory"]],sent:["我的工作很忙。","Wǒ de gōngzuò hěn máng.","My job is very busy."]},
{c:"作",p:"zuò",m:"to do; to make; work",comp:["人"],story:"Person (亻) plus 乍. Sounds identical to 做 — 作 lives in nouns like 工作, 作业; 做 is the everyday verb.",words:[["工作","gōngzuò","work"],["作业","zuòyè","homework"],["作家","zuòjiā","writer"]],sent:["我有很多作业。","Wǒ yǒu hěn duō zuòyè.","I have a lot of homework."]},
{c:"事",p:"shì",m:"matter; affair; thing",comp:[],story:"A hand holding a banner — official business. 东西 is a physical thing; 事 is a thing that happens.",words:[["事情","shìqing","matter"],["没事","méishì","it's nothing"],["故事","gùshi","story"]],sent:["没事，别担心。","Méishì, bié dānxīn.","It's fine, don't worry."]},
{c:"问",p:"wèn",m:"to ask",comp:["门","口"],story:"A mouth (口) inside a gate (门) — knocking and calling through the door. Asking.",words:[["请问","qǐngwèn","excuse me"],["问题","wèntí","question; problem"],["问好","wènhǎo","send regards"]],sent:["我可以问你一个问题吗？","Wǒ kěyǐ wèn nǐ yí gè wèntí ma?","Can I ask you a question?"]},
{c:"题",p:"tí",m:"topic; question; problem",comp:["是","页"],story:"Almost always seen in 问题 — which means both 'question' and 'problem'. Context decides which.",words:[["问题","wèntí","question; problem"],["题目","tímù","topic"]],sent:["这个问题很难。","Zhège wèntí hěn nán.","This question is hard."]},
{c:"明",p:"míng",m:"bright; clear; next",comp:["日","月"],story:"Sun (日) + moon (月) = the two brightest things in the sky, side by side. The clearest character in Chinese, in every sense.",words:[["明天","míngtiān","tomorrow"],["明白","míngbai","understand"],["聪明","cōngming","clever"]],sent:["明天见！","Míngtiān jiàn!","See you tomorrow!"]},
{c:"白",p:"bái",m:"white; clear; in vain",comp:["日"],story:"The sun (日) with a ray coming off the top — the first white light of dawn.",words:[["明白","míngbai","understand"],["白色","báisè","white"],["白天","báitiān","daytime"]],sent:["我明白了。","Wǒ míngbai le.","I understand."]},
{c:"早",p:"zǎo",m:"early; morning",comp:["日","十"],story:"The sun (日) risen just above the horizon — early. 早 on its own is a casual 'morning!'.",words:[["早上","zǎoshang","morning"],["早饭","zǎofàn","breakfast"],["早点","zǎodiǎn","earlier"]],sent:["早上好！","Zǎoshang hǎo!","Good morning!"]},
{c:"晚",p:"wǎn",m:"late; evening",comp:["日"],story:"Sun (日) plus 免 — the sun has been excused for the day. Evening, or simply 'late'.",words:[["晚上","wǎnshang","evening"],["晚饭","wǎnfàn","dinner"],["太晚","tài wǎn","too late"]],sent:["晚上好。","Wǎnshang hǎo.","Good evening."]},
{c:"午",p:"wǔ",m:"noon; midday",comp:["十"],story:"Splits the day in half: 上午 (before noon), 中午 (noon), 下午 (afternoon). Reuse 上 and 下 and you get all three free.",words:[["中午","zhōngwǔ","noon"],["下午","xiàwǔ","afternoon"],["上午","shàngwǔ","morning"]],sent:["下午我有课。","Xiàwǔ wǒ yǒu kè.","I have class in the afternoon."]},
{c:"星",p:"xīng",m:"star",comp:["日","生"],story:"Sun (日) over 生 (to be born) — lights being born in the sky at dusk.",words:[["星期","xīngqī","week"],["明星","míngxīng","celebrity"],["星星","xīngxing","star"]],sent:["今天星期几？","Jīntiān xīngqī jǐ?","What day is it today?"]},
{c:"期",p:"qī",m:"period; term",comp:["月"],story:"Moon (月) on the right — periods of time were measured by moons. 星期一 to 星期六 are Monday to Saturday, numbered; Sunday is 星期天.",words:[["星期","xīngqī","week"],["日期","rìqī","date"],["学期","xuéqī","semester"]],sent:["下个星期我去北京。","Xià gè xīngqī wǒ qù Běijīng.","I'm going to Beijing next week."]},
{c:"分",p:"fēn",m:"minute; to divide",comp:["刀"],story:"A knife (刀) under 八 (eight, splitting apart) — cutting something in two. Hence 'minute': a divided hour.",words:[["十分","shífēn","ten minutes; very"],["分钟","fēnzhōng","minute"],["部分","bùfen","part"]],sent:["现在三点十分。","Xiànzài sān diǎn shí fēn.","It's ten past three."]},
{c:"点",p:"diǎn",m:"dot; o'clock; a little",comp:[],story:"Four dots (灬) at the bottom — a fire radical, from lit lamp-marks. Three jobs: o'clock (三点), a little (一点儿), and ordering food (点菜).",words:[["一点","yìdiǎn","a little"],["几点","jǐ diǎn","what time"],["点菜","diǎncài","order food"]],sent:["你几点起床？","Nǐ jǐ diǎn qǐchuáng?","What time do you get up?"]},
{c:"钟",p:"zhōng",m:"clock; o'clock",comp:["钅","中"],story:"Metal (钅) plus 中 for the sound — a bronze bell. Bells were the first clocks.",words:[["分钟","fēnzhōng","minute"],["点钟","diǎnzhōng","o'clock"],["钟头","zhōngtóu","hour"]],sent:["等我五分钟。","Děng wǒ wǔ fēnzhōng.","Wait five minutes for me."]},
{c:"爱",p:"ài",m:"to love",comp:["友"],story:"The traditional 愛 has a heart (心) at its centre — and the simplified 爱 replaced it with 友 (friend). Both readings are lovely.",words:[["爱人","àiren","spouse"],["可爱","kě'ài","cute"],["爱好","àihào","hobby"]],sent:["我爱我的家人。","Wǒ ài wǒ de jiārén.","I love my family."]},
{c:"喜",p:"xǐ",m:"happy; to like",comp:["口"],story:"A drum above a mouth (口) — music and singing. Doubled as 囍 it's the double-happiness symbol at weddings.",words:[["喜欢","xǐhuan","to like"],["喜事","xǐshì","happy occasion"]],sent:["我喜欢喝茶。","Wǒ xǐhuan hē chá.","I like drinking tea."]},
{c:"欢",p:"huān",m:"joyful",comp:["又","欠"],story:"又 (hand) plus 欠 (a person with mouth open) — cheering with your hands up. Lives in 喜欢.",words:[["喜欢","xǐhuan","to like"],["欢迎","huānyíng","welcome"]],sent:["欢迎你！","Huānyíng nǐ!","Welcome!"]},
{c:"得",p:"de",m:"(links verb to description); to obtain",comp:["寸"],story:"A shape-shifter. As de it links a verb to how well it's done: 说得很好 = 'speaks very well'. As dé it means to get; as děi it means 'must'.",words:[["觉得","juéde","to feel; think"],["得到","dédào","obtain"],["记得","jìde","remember"]],sent:["他中文说得很好。","Tā Zhōngwén shuō de hěn hǎo.","He speaks Chinese very well."]},
{c:"太",p:"tài",m:"too; excessively",comp:["大"],story:"大 (big) with an extra dot — bigger than big. Usually pairs with 了: 太贵了 = 'way too expensive'.",words:[["太好了","tài hǎo le","that's great!"],["太多","tài duō","too much"],["太太","tàitai","wife; Mrs."]],sent:["太好了！","Tài hǎo le!","That's wonderful!"]},
{c:"最",p:"zuì",m:"most; -est",comp:["日","又"],story:"The superlative switch. Put 最 in front of any adjective: 最大 = biggest, 最好 = best, 最喜欢 = favourite.",words:[["最好","zuì hǎo","best"],["最后","zuìhòu","last; finally"],["最近","zuìjìn","recently"]],sent:["这是最好的。","Zhè shì zuì hǎo de.","This is the best one."]},
{c:"真",p:"zhēn",m:"true; really",comp:["目"],story:"An eye (目) in the middle — seeing with your own eyes is what makes something true.",words:[["真的","zhēn de","really"],["认真","rènzhēn","serious; earnest"],["真正","zhēnzhèng","genuine"]],sent:["真的吗？","Zhēn de ma?","Really?"]},
{c:"还",p:"hái",m:"still; also; yet",comp:["辶"],story:"Walking radical 辶 — going back round again. As hái it means 'still'; as huán it means 'to return something'.",words:[["还有","háiyǒu","also; still have"],["还是","háishi","or; still"],["还好","hái hǎo","not bad"]],sent:["我还有一个问题。","Wǒ hái yǒu yí gè wèntí.","I still have one question."]},
{c:"就",p:"jiù",m:"then; just; precisely",comp:[],story:"Everywhere in spoken Chinese and hard to pin down. Core sense: immediacy — 我就来 = 'I'm coming right now', 就是他 = 'it's exactly him'.",words:[["就是","jiùshì","exactly"],["就要","jiù yào","about to"],["马上就","mǎshàng jiù","right away"]],sent:["我马上就来。","Wǒ mǎshàng jiù lái.","I'll be there right away."]},
{c:"新",p:"xīn",m:"new",comp:["亲","斤"],story:"亲 beside an axe (斤). Historically it was a tree being cut — freshly split timber is new wood.",words:[["新年","xīnnián","New Year"],["新闻","xīnwén","news"],["最新","zuìxīn","newest"]],sent:["新年快乐！","Xīnnián kuàilè!","Happy New Year!"]}
);

HQ.push(
{c:"米",p:"mǐ",m:"rice (uncooked); metre",comp:[],story:"Grains scattered around a central stalk. It's the 米 in 米饭 — and the 米 in 米字格, the crossed practice square you write characters into.",pos:["n"],o:"Scattered grains on a threshing floor. As a radical it marks most characters about grain and powder — 粉, 糖, 粥.",words:[["米饭","mǐfàn","cooked rice"],["玉米","yùmǐ","corn"]],sent:["我要一碗米饭。","Wǒ yào yì wǎn mǐfàn.","I'd like a bowl of rice."]},
{c:"饭",p:"fàn",m:"cooked rice; a meal",comp:["食"],story:"The food radical 饣 on the left — a lidded pot of grain. In China 吃饭 means 'eat a meal', whatever's actually on the table.",pos:["n"],o:"Simplified from 飯: the food radical 飠 plus 反 for sound. 饣 is a compressed 食, itself a picture of a covered vessel of grain.",words:[["吃饭","chīfàn","eat a meal"],["米饭","mǐfàn","cooked rice"],["早饭","zǎofàn","breakfast"]],sent:["我们去吃饭吧。","Wǒmen qù chīfàn ba.","Let's go and eat."]},
{c:"菜",p:"cài",m:"vegetable; a dish",comp:["艹","木"],story:"The grass radical 艹 on top — anything leafy. On a menu 菜 means a dish of any kind, not just vegetables.",pos:["n"],o:"The grass radical 艹 over 采 (to pick) — plants gathered by hand. The meaning widened from greens to any cooked dish.",words:[["点菜","diǎncài","order dishes"],["青菜","qīngcài","green vegetables"],["菜单","càidān","menu"]],sent:["这个菜很好吃。","Zhège cài hěn hǎochī.","This dish is delicious."]},
{c:"肉",p:"ròu",m:"meat",comp:[],story:"A slab of meat with the marbling drawn in. Squeezed inside other characters it becomes 月 — which is why 有 and 能 look like they contain the moon.",pos:["n"],o:"A cut of meat with striations of fat. As a component it flattened into 月, colliding with the moon radical — one of the great confusions of Chinese writing.",words:[["牛肉","niúròu","beef"],["肉片","ròupiàn","meat slices"]],sent:["我不吃肉。","Wǒ bù chī ròu.","I don't eat meat."]},
{c:"牛",p:"niú",m:"cow; ox",comp:[],story:"A cow's head seen head-on: two horns and the muzzle. 牛 also means 'awesome' in slang — 你真牛！",pos:["n"],o:"A bovine head with horns, viewed frontally. The oracle-bone form shows both horns curving up from a straight face.",words:[["牛肉","niúròu","beef"],["牛奶","niúnǎi","milk"]],sent:["我要牛肉面。","Wǒ yào niúròu miàn.","I'd like beef noodles."]},
{c:"鸡",p:"jī",m:"chicken",comp:["鸟"],story:"The bird radical 鸟 on the right. Look for 鸟 and you'll spot birds all over a menu — 鸡, 鸭, 鹅.",pos:["n"],o:"Simplified from 雞: 奚 for sound plus 隹 or 鳥 for bird. The simplified form swaps the sound element for the shorthand 又.",words:[["鸡肉","jīròu","chicken meat"],["鸡蛋","jīdàn","egg"]],sent:["来一份鸡肉。","Lái yí fèn jīròu.","One portion of chicken, please."]},
{c:"鱼",p:"yú",m:"fish",comp:[],story:"A fish standing on its tail: head, body, fins. Simplified 鱼 turned the tail fin into four dots, then into a single line.",pos:["n"],o:"A vertical fish — head at top, scaled body, tail below. Traditional 魚 keeps the tail as the four-dot 灬.",words:[["鱼肉","yúròu","fish (as food)"],["金鱼","jīnyú","goldfish"]],sent:["这条鱼很新鲜。","Zhè tiáo yú hěn xīnxiān.","This fish is very fresh."]},
{c:"猪",p:"zhū",m:"pig; pork",comp:["犭","者"],story:"The animal radical 犭 on the left — the same one in 猫 (cat) and 狗 (dog). Pork is the default meat in China: 肉 alone on a menu usually means pork.",pos:["n"],o:"The dog/beast radical 犭 plus 者 for sound. The older character for pig, 豕, survives inside 家 — a house with a pig in it.",words:[["猪肉","zhūròu","pork"]],sent:["我要猪肉饺子。","Wǒ yào zhūròu jiǎozi.","I'd like pork dumplings."]},
{c:"羊",p:"yáng",m:"sheep; goat",comp:[],story:"A sheep's head seen from the front — curved horns above, face below. It's the top half of 美 (beautiful): a big sheep was a fine thing.",pos:["n"],o:"A ram's head with curling horns. It carries meaning into 美 (beautiful), 群 (flock) and 鲜 (fresh) — sheep were wealth.",words:[["羊肉","yángròu","lamb; mutton"]],sent:["羊肉很香。","Yángròu hěn xiāng.","The lamb smells wonderful."]},
{c:"蛋",p:"dàn",m:"egg",comp:["虫"],story:"The insect radical 虫 at the bottom — which in old Chinese covered anything that crawled, hatched or slithered.",pos:["n"],o:"疋 for sound above 虫, the radical for creeping and hatching creatures. 虫 originally depicted a snake, not an insect.",words:[["鸡蛋","jīdàn","egg"],["蛋炒饭","dàn chǎofàn","egg fried rice"]],sent:["两个鸡蛋。","Liǎng gè jīdàn.","Two eggs."]},
{c:"汤",p:"tāng",m:"soup",comp:["水"],story:"The water radical 氵 — three drops. Every liquid on a menu carries it: 汤, 酒, 汁, 油.",pos:["n"],o:"Simplified from 湯: water (氵) plus 昜 for sound. It first meant hot water, then broth.",words:[["鸡汤","jītāng","chicken soup"],["汤面","tāngmiàn","noodle soup"]],sent:["先来一个汤。","Xiān lái yí gè tāng.","A soup to start, please."]},
{c:"酒",p:"jiǔ",m:"alcohol; wine",comp:["水","酉"],story:"Water (氵) beside 酉, a wine jar with a narrow neck. 酉 marks anything fermented — 酸 (sour), 醋 (vinegar), 酱 (sauce).",pos:["n"],o:"Water (氵) plus 酉, a picture of a lidded wine vessel. 酉 is one of the oldest radicals and heads every character about fermentation.",words:[["啤酒","píjiǔ","beer"],["白酒","báijiǔ","clear spirits"]],sent:["你喝酒吗？","Nǐ hē jiǔ ma?","Do you drink?"]},
{c:"茶",p:"chá",m:"tea",comp:["艹","木"],story:"Grass (艹) over a tree (木) with a person between — leaves gathered from a bush. Nearly every word for tea on earth comes from this character: chá, or from the Min dialect reading, te.",pos:["n"],o:"The grass radical 艹 above 余. It split from 荼 (a bitter herb) around the Tang dynasty when tea became a distinct commodity.",words:[["喝茶","hē chá","drink tea"],["茶馆","cháguǎn","teahouse"],["绿茶","lǜchá","green tea"]],sent:["请给我一杯茶。","Qǐng gěi wǒ yì bēi chá.","A cup of tea, please."]},
{c:"杯",p:"bēi",m:"cup; glass",comp:["木","不"],story:"Wood (木) plus 不 for sound — cups were turned from wood before they were fired from clay. It's the measure word for any drink: 一杯水.",pos:["n","mw"],o:"The wood radical 木 plus 不 for sound. Early drinking vessels were carved, which is why the radical is timber and not clay.",words:[["一杯","yì bēi","a cup of"],["杯子","bēizi","cup"]],sent:["两杯茶，谢谢。","Liǎng bēi chá, xièxie.","Two teas, thank you."]},
{c:"碗",p:"wǎn",m:"bowl",comp:["石"],story:"The stone radical 石 on the left — bowls were stone and clay long before porcelain. The measure word for rice and noodles: 一碗面.",pos:["n","mw"],o:"Stone (石) plus 宛 for sound. A variant written with the tile radical 瓦 also exists — both point at fired earth.",words:[["一碗","yì wǎn","a bowl of"],["碗筷","wǎnkuài","bowl and chopsticks"]],sent:["一碗牛肉面。","Yì wǎn niúròu miàn.","One bowl of beef noodles."]},
{c:"瓶",p:"píng",m:"bottle",comp:[],story:"并 for sound plus 瓦, the roof-tile radical — fired clay. The measure word for bottled drinks: 一瓶啤酒.",pos:["n","mw"],o:"并 for sound with 瓦 (tile, fired earth) for meaning. 瓦 marks vessels made by firing clay.",words:[["一瓶","yì píng","a bottle of"],["瓶子","píngzi","bottle"]],sent:["来一瓶啤酒。","Lái yì píng píjiǔ.","A bottle of beer, please."]},
{c:"炒",p:"chǎo",m:"to stir-fry",comp:["火","少"],story:"Fire (火) plus 少 (few) — a little heat, moving fast. The defining Chinese cooking verb: 炒饭, 炒面, 炒菜.",pos:["v"],o:"Fire (火) for meaning plus 少 for sound. The fire radical 火 on the left marks cooking methods; underneath a character it becomes the four dots 灬.",words:[["炒饭","chǎofàn","fried rice"],["炒面","chǎomiàn","fried noodles"]],sent:["我要一份炒饭。","Wǒ yào yí fèn chǎofàn.","I'd like a portion of fried rice."]},
{c:"辣",p:"là",m:"spicy; hot",comp:[],story:"辛 on the left means pungent or bitter. If you can't handle chilli, the sentence to memorise is 不要辣.",pos:["adj"],o:"辛 (pungent, and originally a tattooing knife) plus 束 for sound. 辛 marks the sharp, painful end of the flavour range.",words:[["麻辣","málà","numbing-spicy"],["辣椒","làjiāo","chilli pepper"]],sent:["请不要太辣。","Qǐng bú yào tài là.","Not too spicy, please."]},
{c:"甜",p:"tián",m:"sweet",comp:["舌","甘"],story:"A tongue (舌) beside 甘 (sweetness) — taste drawn as the organ that does the tasting.",pos:["adj"],o:"Tongue (舌) plus 甘, itself a mouth with a mark inside showing something held and savoured.",words:[["甜点","tiándiǎn","dessert"],["很甜","hěn tián","very sweet"]],sent:["这个太甜了。","Zhège tài tián le.","This is too sweet."]},
{c:"酸",p:"suān",m:"sour",comp:[],story:"The wine-jar radical 酉 on the left — sourness is what happens when fermentation goes one step too far.",pos:["adj"],o:"酉 (the fermentation vessel) plus 夋 for sound. Sour and alcoholic share a radical because they share a process.",words:[["酸辣","suānlà","hot and sour"],["酸奶","suānnǎi","yoghurt"]],sent:["我喜欢酸辣汤。","Wǒ xǐhuan suānlà tāng.","I love hot and sour soup."]},
{c:"香",p:"xiāng",m:"fragrant; tasty",comp:["日"],story:"Grain (禾) above a mouth or vessel — the smell of cooking cereal. It's the highest compliment for food that isn't about flavour but about smell.",pos:["adj"],o:"Grain (禾) over 甘 (sweet), later simplified to 日. The scent of millet cooking was the ancient definition of a good smell.",words:[["香菜","xiāngcài","coriander"],["很香","hěn xiāng","smells lovely"]],sent:["这个菜真香。","Zhège cài zhēn xiāng.","This dish smells wonderful."]},
{c:"店",p:"diàn",m:"shop; store",comp:["广"],story:"A roof (广) over 占 — a stall set up under an awning. You'll see it ending shop names everywhere: 饭店, 书店, 商店.",pos:["n"],o:"The shelter radical 广 (a lean-to roof) plus 占 for sound. 广 marks buildings open on one side — shops, halls, warehouses.",words:[["饭店","fàndiàn","restaurant; hotel"],["书店","shūdiàn","bookshop"],["商店","shāngdiàn","shop"]],sent:["那家饭店很好。","Nà jiā fàndiàn hěn hǎo.","That restaurant is very good."]},
{c:"馆",p:"guǎn",m:"establishment; venue",comp:["食"],story:"The food radical 饣 again — 馆 began as a place that fed travellers. Now it names restaurants, teahouses, museums and libraries.",pos:["n"],o:"Simplified from 館: the food radical 飠 plus 官 for sound. It first meant a post-house where officials were lodged and fed.",words:[["饭馆","fànguǎn","restaurant"],["茶馆","cháguǎn","teahouse"],["图书馆","túshūguǎn","library"]],sent:["我们去那个饭馆。","Wǒmen qù nàge fànguǎn.","Let's go to that restaurant."]},
{c:"单",p:"dān",m:"single; a list; bill",comp:[],story:"Simplified from 單. Two jobs worth knowing: 单 means 'single' (单人 = one person), and it means a printed list — 菜单 is the menu, 买单 is the bill.",pos:["adj","n"],o:"Simplified from 單, probably a forked hunting weapon, borrowed for sound. The 'list' sense developed much later.",words:[["菜单","càidān","menu"],["买单","mǎidān","pay the bill"],["单人","dānrén","single (person)"]],sent:["请给我菜单。","Qǐng gěi wǒ càidān.","The menu, please."]},
{c:"服",p:"fú",m:"clothes; to serve",comp:["月"],story:"Two distant meanings in one character: clothing (衣服) and service (服务). The 月 on the left is 舟, a boat, worn down by centuries of copying.",pos:["n","v"],o:"The left element was originally 舟 (boat), not 月. It meant to submit or serve, and the clothing sense grew from garments of office.",words:[["服务","fúwù","service"],["衣服","yīfu","clothes"],["服务员","fúwùyuán","waiter"]],sent:["这里的服务很好。","Zhèlǐ de fúwù hěn hǎo.","The service here is good."]},
{c:"务",p:"wù",m:"affair; duty",comp:["力"],story:"力 (strength) at the bottom — effort applied to a task. It lives almost entirely inside 服务, service.",pos:["n"],o:"Simplified from 務: 矛 for sound plus 力 (strength, drawn as a plough). Work that must be done.",words:[["服务","fúwù","service"],["任务","rènwù","task"]],sent:["服务员，买单！","Fúwùyuán, mǎidān!","Waiter, the bill!"]},
{c:"员",p:"yuán",m:"member; staff",comp:["口","贝"],story:"A mouth (口) above a cowrie shell (贝) — a person counted on the payroll. It suffixes job titles: 服务员, 演员, 运动员.",pos:["n"],o:"Originally a round vessel (口 over 鼎, later 贝), meaning 'round' — the ancestor of 圆. Borrowed to mean a counted member of a group.",words:[["服务员","fúwùyuán","waiter; attendant"],["人员","rényuán","personnel"]],sent:["服务员来了。","Fúwùyuán lái le.","The waiter is coming."]}
);

HQ.push(
{c:"四",p:"sì",m:"four",comp:["囗"],pos:["num"],story:"Counting by scratches stops at three — four would be unreadable. So 四 borrowed a different shape entirely: a mouth with legs.",o:"Originally four horizontal strokes, abandoned because 三 and 四 became indistinguishable. The modern form was borrowed for its sound.",words:[["四月","sìyuè","April"],["四十","sìshí","forty"],["四个","sì gè","four (items)"]],sent:["我们四个人。","Wǒmen sì gè rén.","There are four of us."]},
{c:"五",p:"wǔ",m:"five",comp:["二"],pos:["num"],story:"Two lines with a cross between them — a tally knot. Half of ten, and the hinge of the counting system.",o:"An X between two horizontal lines, probably a counting knot or crossing tally marks.",words:[["五月","wǔyuè","May"],["五十","wǔshí","fifty"]],sent:["五点半见。","Wǔ diǎn bàn jiàn.","See you at half past five."]},
{c:"六",p:"liù",m:"six",comp:[],pos:["num"],story:"A little hut with legs. Nothing to do with sixness — it was borrowed purely for sound.",o:"Probably a picture of a simple shelter, borrowed phonetically. Many number characters work this way.",words:[["六月","liùyuè","June"],["六十","liùshí","sixty"]],sent:["我六点起床。","Wǒ liù diǎn qǐchuáng.","I get up at six."]},
{c:"七",p:"qī",m:"seven",comp:[],pos:["num"],story:"A hooked stroke crossing a line. Watch it against 十 — the hook at the bottom is the whole difference, and they are not related.",o:"Originally a horizontal line cut by a vertical, meaning 'to cut'. That sense moved to 切; the number stayed.",words:[["七月","qīyuè","July"],["七十","qīshí","seventy"]],sent:["一个星期有七天。","Yí gè xīngqī yǒu qī tiān.","A week has seven days."]},
{c:"八",p:"bā",m:"eight",comp:[],pos:["num"],story:"Two strokes splitting apart. It's the luckiest number in Chinese — 八 sounds like 发, to prosper.",o:"A picture of division, two things turning away from each other. It still carries that meaning inside 分 and 半.",words:[["八月","bāyuè","August"],["八十","bāshí","eighty"]],sent:["这个八块钱。","Zhège bā kuài qián.","This one is eight yuan."]},
{c:"九",p:"jiǔ",m:"nine",comp:[],pos:["num"],story:"A bent elbow, or a hook. It sounds like 久 (a long time), which is why nine turns up at weddings.",o:"Probably a hand with a crooked arm. Borrowed for the number and never looked back.",words:[["九月","jiǔyuè","September"],["九十","jiǔshí","ninety"]],sent:["他九岁了。","Tā jiǔ suì le.","He's nine years old."]},
{c:"零",p:"líng",m:"zero; and a fraction",comp:["雨"],pos:["num"],story:"Rain (雨) on top — it first meant scattered drops, hence 'a remainder'. Modern Chinese also writes zero as 〇.",o:"Rain (雨) plus 令 for sound. It meant drizzle, then leftovers, then zero.",words:[["零钱","língqián","small change"],["三零五","sān líng wǔ","305"]],sent:["现在两点零五分。","Xiànzài liǎng diǎn líng wǔ fēn.","It's five past two."]},
{c:"号",p:"hào",m:"number; date",comp:["口"],pos:["n"],story:"How you say the day of the month: 九月八号. Also room numbers, sizes and phone numbers.",o:"Simplified from 號: a mouth (口) calling out, plus 虎 (tiger) for sound. It meant to shout, then to designate.",words:[["几号","jǐ hào","what date"],["号码","hàomǎ","number"]],sent:["今天几号？","Jīntiān jǐ hào?","What's the date today?"]},
{c:"次",p:"cì",m:"time (occurrence); order",comp:["冫","欠"],pos:["mw","n"],story:"The measure word for how many times something happens: 一次, 两次, 下次.",o:"The ice radical 冫 (which looks like a small 二) beside 欠, a person exhaling. It meant to stop at second place, hence 'next in order'.",words:[["一次","yí cì","once"],["下次","xià cì","next time"],["第一次","dì yī cì","the first time"]],sent:["我去过两次。","Wǒ qù guo liǎng cì.","I've been twice."]},
{c:"为",p:"wèi",m:"for; because of",comp:[],pos:["cov","v"],story:"Two tones, two jobs: wèi means 'for the sake of', wéi means 'to act as'. 因为 (because) uses the fourth tone.",o:"Simplified from 為, originally a hand leading an elephant — to do, to make. The grammatical senses came later.",words:[["因为","yīnwèi","because"],["为什么","wèishénme","why"],["认为","rènwéi","to think"]],sent:["我为你高兴。","Wǒ wèi nǐ gāoxìng.","I'm happy for you."]},
{c:"因",p:"yīn",m:"cause; because",comp:["囗","大"],pos:["n","conj"],story:"A person (大) lying inside a mat (囗) — the thing they're resting on, the thing underneath. Hence the cause.",o:"A person on a mattress, enclosed. The sense of 'what a thing rests on' became 'reason'.",words:[["因为","yīnwèi","because"],["原因","yuányīn","reason"]],sent:["因为下雨，我没去。","Yīnwèi xiàyǔ, wǒ méi qù.","I didn't go because it rained."]},
{c:"所",p:"suǒ",m:"place; (nominaliser)",comp:["斤"],pos:["n","part-str"],story:"Its commonest job is grammatical: 所以 (so, therefore). It also means a place — 厕所, a toilet.",o:"A door (户) plus an axe (斤) — the sound of chopping at a doorway. Borrowed early for its grammatical uses.",words:[["所以","suǒyǐ","so; therefore"],["厕所","cèsuǒ","toilet"]],sent:["下雨了，所以我没去。","Xiàyǔ le, suǒyǐ wǒ méi qù.","It rained, so I didn't go."]},
{c:"以",p:"yǐ",m:"with; by means of",comp:["人"],pos:["cov"],story:"A workhorse of written Chinese. It builds 所以 (so), 以后 (after), 以前 (before), 可以 (may).",o:"A person carrying something — 'using' it. One of the oldest grammatical words still in daily use.",words:[["可以","kěyǐ","may; can"],["以后","yǐhòu","afterwards"],["以前","yǐqián","before"]],sent:["你可以走了。","Nǐ kěyǐ zǒu le.","You may go now."]},
{c:"可",p:"kě",m:"can; but",comp:["口"],pos:["aux","conj"],story:"A mouth (口) giving permission. It means 'may' in 可以, 'but' in 可是, and 'quite' before an adjective.",o:"A mouth with a bent shape beneath — approval spoken aloud. It is also the sound element in 哥 and 河.",words:[["可以","kěyǐ","may"],["可是","kěshì","but"],["可爱","kě'ài","cute"]],sent:["可是我不想去。","Kěshì wǒ bù xiǎng qù.","But I don't want to go."]},
{c:"但",p:"dàn",m:"but; only",comp:["人","日"],pos:["conj"],story:"Person (亻) plus dawn (旦). Pairs with 是 to make 但是 — the everyday 'but'.",o:"A person (亻) plus 旦 (sunrise) for sound. It first meant 'only', which is still there in 不但.",words:[["但是","dànshì","but"],["不但","búdàn","not only"]],sent:["我想去，但是没时间。","Wǒ xiǎng qù, dànshì méi shíjiān.","I'd like to go, but I have no time."]},
{c:"而",p:"ér",m:"and; yet",comp:[],pos:["conj"],story:"A drawing of a beard hanging from a chin — borrowed for one of the most useful connectives in written Chinese.",o:"A picture of whiskers. Borrowed phonetically so long ago that the beard is entirely forgotten.",words:[["而且","érqiě","moreover"],["然而","rán'ér","however"]],sent:["他很忙，而且很累。","Tā hěn máng, érqiě hěn lèi.","He's busy, and tired as well."]},
{c:"且",p:"qiě",m:"moreover; for now",comp:[],pos:["conj","adv"],story:"An ancestral tablet, stacked. It lives mostly inside 而且 (what's more) and 并且.",o:"A stone ancestral tablet seen from the side — the original of 祖 (ancestor). Borrowed for its sound.",words:[["而且","érqiě","moreover"],["并且","bìngqiě","and also"]],sent:["菜好吃，而且不贵。","Cài hǎochī, érqiě bú guì.","The food is good, and not expensive either."]},
{c:"或",p:"huò",m:"or",comp:["戈","口"],pos:["conj"],story:"For 'or' in statements — 茶或咖啡. In questions Chinese uses 还是 instead, which trips up every learner.",o:"A weapon guarding a border — the original of 國 (country). Borrowed for 'perhaps', then 'or'.",words:[["或者","huòzhě","or"],["或许","huòxǔ","perhaps"]],sent:["茶或者水都可以。","Chá huòzhě shuǐ dōu kěyǐ.","Tea or water, either is fine."]},
{c:"者",p:"zhě",m:"one who; -er",comp:["日"],pos:["part-str"],story:"Turns a verb into a person: 作者 (writer), 读者 (reader), 记者 (reporter).",o:"Disputed — possibly sugarcane, possibly a brazier. Grammatically it has marked 'the one who does X' for three thousand years.",words:[["或者","huòzhě","or"],["作者","zuòzhě","author"],["读者","dúzhě","reader"]],sent:["这本书的作者是谁？","Zhè běn shū de zuòzhě shì shéi?","Who is the author of this book?"]},
{c:"如",p:"rú",m:"like; if",comp:["女","口"],pos:["cov","conj"],story:"Woman (女) plus mouth (口) — to follow what's said, hence 'to be like'. It opens conditions: 如果.",o:"A mouth (口) and 女, read as complying with an instruction. From 'to accord with' came 'like' and then 'if'.",words:[["如果","rúguǒ","if"],["比如","bǐrú","for example"]],sent:["如果下雨，我们不去。","Rúguǒ xiàyǔ, wǒmen bú qù.","If it rains, we won't go."]},
{c:"果",p:"guǒ",m:"fruit; result",comp:["田","木"],pos:["n"],story:"Fruit sitting on a tree (木) — the round shape on top is the fruit itself. Hence also 'outcome'.",o:"A tree with round fruit drawn in its crown. One of the clearer surviving pictographs.",words:[["水果","shuǐguǒ","fruit"],["如果","rúguǒ","if"],["结果","jiéguǒ","result"]],sent:["我喜欢吃水果。","Wǒ xǐhuan chī shuǐguǒ.","I like eating fruit."]},
{c:"虽",p:"suī",m:"although",comp:["口","虫"],pos:["conj"],story:"Almost always 虽然. Chinese keeps the 'but' as well: 虽然…但是… — both halves, unlike English.",o:"Simplified from 雖: 虫 plus 唯 for sound. It named a kind of lizard before being borrowed wholesale.",words:[["虽然","suīrán","although"]],sent:["虽然很贵，但是很好。","Suīrán hěn guì, dànshì hěn hǎo.","Although it's expensive, it's very good."]},
{c:"然",p:"rán",m:"so; thus",comp:["肉","火"],pos:["part-str"],story:"Meat (⺼) over fire (灬) — it originally meant 'to burn'. Borrowed so thoroughly that 燃 had to be invented to burn things again.",o:"Dog meat over a fire, meaning to burn. The grammatical 'thus' took over completely, forcing 燃 into existence.",words:[["然后","ránhòu","then"],["虽然","suīrán","although"],["当然","dāngrán","of course"]],sent:["先吃饭，然后去。","Xiān chīfàn, ránhòu qù.","Eat first, then go."]},
{c:"把",p:"bǎ",m:"(object marker); handle",comp:["手"],pos:["cov","mw"],story:"One of the trickiest patterns in Chinese: 把 moves the object in front of the verb — 把门关上, 'shut the door'.",o:"Hand radical 扌 plus 巴 for sound — to grasp. The grammar grew straight out of the grip.",words:[["一把","yì bǎ","a handful of"],["把手","bǎshou","handle"]],sent:["请把门关上。","Qǐng bǎ mén guānshàng.","Please close the door."]},
{c:"被",p:"bèi",m:"by (passive marker)",comp:["衣"],pos:["cov","n"],story:"The passive: 被吃了 means 'was eaten'. Traditionally it carried a whiff of misfortune — things done TO you.",o:"The clothing radical 衤 plus 皮 for sound — it meant a quilt, and still does. The passive use is a borrowing.",words:[["被子","bèizi","quilt"]],sent:["我的茶被喝了。","Wǒ de chá bèi hē le.","My tea got drunk."]},
{c:"让",p:"ràng",m:"to let; to yield",comp:["讠"],pos:["v"],story:"Speech radical 讠 — you let someone do something by saying so. 让我看看 — let me have a look.",o:"Simplified from 讓: speech (訁) plus 襄 for sound. To yield ground in words, hence to permit.",words:[["让开","ràngkāi","move aside"]],sent:["让我看看。","Ràng wǒ kànkan.","Let me have a look."]},
{c:"向",p:"xiàng",m:"towards",comp:["口"],pos:["cov","n"],story:"A window in a wall, facing out. It points the direction of an action: 向前走, walk forwards.",o:"A north-facing window under a roof. From 'facing' came 'towards'.",words:[["方向","fāngxiàng","direction"],["向前","xiàngqián","forward"]],sent:["请向左走。","Qǐng xiàng zuǒ zǒu.","Please go to the left."]},
{c:"比",p:"bǐ",m:"to compare; than",comp:[],pos:["cov","v"],story:"Two people standing side by side, facing the same way. Comparison drawn literally: 我比你高.",o:"Two figures aligned — the mirror of 从, where one follows the other. Here they stand level, to be measured against each other.",words:[["比较","bǐjiào","comparatively"],["比如","bǐrú","for example"]],sent:["他比我高。","Tā bǐ wǒ gāo.","He's taller than me."]},
{c:"跟",p:"gēn",m:"with; to follow",comp:["足"],pos:["cov","v"],story:"The foot radical 足 — to follow at someone's heel. It also means 'and' between nouns, like 和.",o:"Foot (足) plus 艮 for sound. It first meant a heel, which it still does in 脚跟.",words:[["跟着","gēnzhe","following"],["我跟你","wǒ gēn nǐ","you and I"]],sent:["我跟他一起去。","Wǒ gēn tā yìqǐ qù.","I'm going with him."]},
{c:"过",p:"guò",m:"to pass; (experience marker)",comp:["辶"],pos:["v","part-asp"],story:"After a verb it means you've done it at some point: 我去过中国 — I've been to China. Different from 了, which marks completion.",o:"Simplified from 過: the walking radical 辶 plus 咼 for sound. To pass by, then to have passed through.",words:[["过来","guòlái","come over"],["不过","búguò","however"],["过去","guòqù","the past"]],sent:["我吃过中国菜。","Wǒ chī guo Zhōngguó cài.","I've eaten Chinese food before."]},
{c:"着",p:"zhe",m:"(ongoing state marker)",comp:["目"],pos:["part-asp"],story:"Marks a state that's holding: 门开着 — the door is standing open. Read zháo it means to succeed, read zhuó to wear.",o:"A variant of 著. The unstressed grammatical reading split off from the fuller word and took on its own life.",words:[["看着","kànzhe","watching"],["着急","zháojí","anxious"]],sent:["他在门口站着。","Tā zài ménkǒu zhànzhe.","He's standing in the doorway."]}
);
HQ.push(
{c:"正",p:"zhèng",m:"upright; exactly",comp:["一","止"],pos:["adj","adv"],story:"A foot (止) stopping square on a line — straight, correct. 正在 marks something happening right now.",o:"A foot halted at a boundary, meaning to march straight at a target. Hence upright, correct, and precisely.",words:[["正在","zhèngzài","in the middle of"],["真正","zhēnzhèng","genuine"]],sent:["他正在吃饭。","Tā zhèngzài chīfàn.","He's eating right now."]},
{c:"入",p:"rù",m:"to enter",comp:[],pos:["v"],story:"An arrowhead pointing in. Careful — it's the mirror image of 人 (person), and the stroke order differs.",o:"A pointed shape driving inward, perhaps a plough or an entrance. It contrasts with 出, to go out.",words:[["进入","jìnrù","to enter"],["入口","rùkǒu","entrance"]],sent:["入口在那边。","Rùkǒu zài nàbiān.","The entrance is over there."]},
{c:"出",p:"chū",m:"to go out",comp:[],pos:["v"],story:"A foot stepping up out of a hollow. It looks like two 山 stacked, but that resemblance is an accident of later brush forms.",o:"A foot leaving a pit or doorway. The two-mountain look is a coincidence of later brush forms.",words:[["出去","chūqù","go out"],["出来","chūlái","come out"],["出口","chūkǒu","exit"]],sent:["我出去买东西。","Wǒ chūqù mǎi dōngxi.","I'm going out to buy things."]},
{c:"进",p:"jìn",m:"to enter; to advance",comp:["辶"],pos:["v"],story:"Walking radical 辶 with 井 for sound. Pairs with 出 constantly: 进来, 出去.",o:"Simplified from 進: the walking radical plus 隹 (a bird), because birds move forward and not back.",words:[["进来","jìnlái","come in"],["进去","jìnqù","go in"]],sent:["请进来。","Qǐng jìnlái.","Please come in."]},
{c:"用",p:"yòng",m:"to use",comp:[],pos:["v"],story:"A bucket or a bronze vessel — a thing for using. 不用 means 'no need', and is how you decline politely.",o:"Probably a wooden pail. It has meant 'to use' since the oracle bones.",words:[["不用","búyòng","no need"],["有用","yǒuyòng","useful"],["用法","yòngfǎ","usage"]],sent:["不用谢。","Búyòng xiè.","Don't mention it."]},
{c:"发",p:"fā",m:"to send out; hair",comp:[],pos:["v","n"],story:"Simplification merged two characters: 發 (to send, fā) and 髮 (hair, fà). Same shape now, two readings.",o:"發 was an arrow loosed from a bow; 髮 was hair on a head. Simplified Chinese collapsed both into 发.",words:[["发现","fāxiàn","to discover"],["头发","tóufa","hair"],["发音","fāyīn","pronunciation"]],sent:["我发现一个问题。","Wǒ fāxiàn yí gè wèntí.","I've found a problem."]},
{c:"成",p:"chéng",m:"to become; to succeed",comp:[],pos:["v"],story:"A halberd with a mark — a task cut through and finished. 成 turns things into other things: 变成.",o:"A weapon plus a mark of completion. To bring to an end, hence to accomplish and to become.",words:[["成为","chéngwéi","to become"],["完成","wánchéng","to complete"]],sent:["他成了老师。","Tā chéng le lǎoshī.","He became a teacher."]},
{c:"方",p:"fāng",m:"square; direction; method",comp:[],pos:["n","adj"],story:"A plough handle, or a banner. Three senses worth knowing: a square, a direction (东方), and a method (方法).",o:"Probably a plough with a crossbar. The meanings fan out from 'sides' — squares, directions, ways of doing.",words:[["地方","dìfang","place"],["方法","fāngfǎ","method"],["方向","fāngxiàng","direction"]],sent:["这个地方很好。","Zhège dìfang hěn hǎo.","This place is lovely."]},
{c:"种",p:"zhǒng",m:"kind, sort; to plant",comp:["中"],pos:["mw","n","v"],story:"Grain (禾) plus 中 — seed. As a measure word it counts kinds of things: 这种茶, this kind of tea.",o:"Simplified from 種: grain (禾) plus 重 for sound. A seed, then a type, then the act of sowing (zhòng).",words:[["一种","yì zhǒng","a kind of"],["种子","zhǒngzi","seed"]],sent:["这种茶很香。","Zhè zhǒng chá hěn xiāng.","This kind of tea is fragrant."]},
{c:"将",p:"jiāng",m:"will; to take",comp:["寸"],pos:["adv","n"],story:"Formal written Chinese uses 将 where speech uses 会 or 把. Read jiàng it means a general.",o:"Simplified from 將: a hand (寸) offering meat at an altar. From presenting came leading, and a general.",words:[["将来","jiānglái","the future"],["将军","jiāngjūn","general"]],sent:["将来我想去中国。","Jiānglái wǒ xiǎng qù Zhōngguó.","In the future I want to go to China."]},
{c:"只",p:"zhǐ",m:"only; (measure word)",comp:["口","八"],pos:["adv","mw"],story:"Two readings: zhǐ means 'only', zhī is the measure word for animals — 一只鸡.",o:"A mouth with breath escaping below. Simplified Chinese merged it with 隻, the bird-counting word, so it now does both jobs.",words:[["只有","zhǐyǒu","only if"],["一只","yì zhī","one (animal)"]],sent:["我只有十块钱。","Wǒ zhǐ yǒu shí kuài qián.","I've only got ten yuan."]},
{c:"主",p:"zhǔ",m:"main; owner",comp:[],pos:["adj","n"],story:"A lamp with its flame on top — the central light of a room, hence the host. It's the sound in 住.",o:"A standing lamp with a burning wick. The flame at the centre of the household came to mean the head of it.",words:[["主人","zhǔrén","host; owner"],["主要","zhǔyào","main"]],sent:["这是主要的问题。","Zhè shì zhǔyào de wèntí.","This is the main problem."]},
{c:"公",p:"gōng",m:"public; male (animal)",comp:["八"],pos:["adj","n"],story:"八 (dividing) over 厶 (private) — splitting up what was held privately. That's the public.",o:"The splitting marks 八 above 厶, the old graph for private. To divide what is private makes it common.",words:[["公司","gōngsī","company"],["公共","gōnggòng","public"],["公园","gōngyuán","park"]],sent:["我在公司工作。","Wǒ zài gōngsī gōngzuò.","I work at a company."]},
{c:"已",p:"yǐ",m:"already",comp:[],pos:["adv"],story:"Watch it beside 己 (oneself) and 巳 — three characters differing by how far one stroke rises. 已经 means 'already'.",o:"A variant of 巳, borrowed for 'to cease' and then 'already'. The near-identical trio has troubled scribes for millennia.",words:[["已经","yǐjīng","already"]],sent:["我已经吃了。","Wǒ yǐjīng chī le.","I've already eaten."]},
{c:"更",p:"gèng",m:"even more",comp:[],pos:["adv"],story:"Stack it before an adjective for a step up: 更好, better still. Read gēng it means to change.",o:"A hand with a stick, meaning to alter or replace. The comparative sense grew from 'changing to a greater degree'.",words:[["更好","gèng hǎo","even better"],["更多","gèng duō","even more"]],sent:["这个更好吃。","Zhège gèng hǎochī.","This one tastes even better."]},
{c:"才",p:"cái",m:"only then; talent",comp:[],pos:["adv","n"],story:"A sprout breaking ground. As an adverb it marks something happening later or only under a condition: 他才来 — he only just arrived.",o:"A shoot pushing through the soil line — potential emerging. Hence both 'talent' and the sense of something only now arriving.",words:[["刚才","gāngcái","just now"],["才能","cáinéng","ability"]],sent:["他八点才来。","Tā bā diǎn cái lái.","He didn't come until eight."]},
{c:"再",p:"zài",m:"again (in future)",comp:["一"],pos:["adv"],story:"For repeats that haven't happened yet: 再见 — see you again. For repeats already done, Chinese uses 又.",o:"A picture of stacked fish or piled objects — one more on top. Hence a second time.",words:[["再见","zàijiàn","goodbye"],["再来","zài lái","come again"]],sent:["明天再见。","Míngtiān zàijiàn.","See you again tomorrow."]},
{c:"别",p:"bié",m:"don't; other",comp:["刀"],pos:["adv","adj"],story:"A knife (刂) separating bone from flesh — to part, hence 'other'. As a command it means 'don't': 别走.",o:"Bone and a knife: cutting apart. From separation came both 'other' and the prohibitive 'don't'.",words:[["别的","biéde","other"],["特别","tèbié","especially"]],sent:["别客气。","Bié kèqi.","Don't stand on ceremony."]},
{c:"些",p:"xiē",m:"some; a few",comp:["二","止"],pos:["mw"],story:"Always after 这, 那 or 一: 这些, 那些, 一些. It never counts on its own.",o:"止 (a foot) over 二, borrowed for its sound. It has marked indefinite plurals since the Tang dynasty.",words:[["一些","yìxiē","some"],["这些","zhèxiē","these"],["那些","nàxiē","those"]],sent:["我买了一些水果。","Wǒ mǎi le yìxiē shuǐguǒ.","I bought some fruit."]},
{c:"每",p:"měi",m:"every",comp:["母"],pos:["pron"],story:"A woman with an ornament — borrowed for 'each'. It usually pairs with 都: 每天都去.",o:"A mother figure (母) with a hairpin. Borrowed phonetically for 'each and every'.",words:[["每天","měitiān","every day"],["每个","měi gè","each"]],sent:["我每天都学中文。","Wǒ měitiān dōu xué Zhōngwén.","I study Chinese every day."]},
{c:"另",p:"lìng",m:"another; separate",comp:["口","力"],pos:["adj","adv"],story:"Mouth (口) over strength (力) — set apart from the rest. Usually 另外.",o:"A variant that split off from 别, keeping the 'separate' half of its meaning.",words:[["另外","lìngwài","besides; another"]],sent:["还有另外一个问题。","Hái yǒu lìngwài yí gè wèntí.","There's another problem as well."]},
{c:"各",p:"gè",m:"each; various",comp:["口"],pos:["pron"],story:"A foot arriving at a doorway (口) — each one coming in turn. It's the top half of 客 and 路.",o:"A foot approaching an entrance, meaning to arrive. Borrowed for 'each and every one'.",words:[["各种","gèzhǒng","all kinds of"],["各位","gèwèi","everyone (formal)"]],sent:["这里有各种水果。","Zhèlǐ yǒu gèzhǒng shuǐguǒ.","There are all sorts of fruit here."]},
{c:"定",p:"dìng",m:"to fix; certainly",comp:["宀"],pos:["v","adv"],story:"A roof (宀) over 疋 — the household settled under cover. 一定 means 'certainly'.",o:"Under a roof, a foot planted straight — the household settled. Hence to determine, and to be sure.",words:[["一定","yídìng","certainly"],["决定","juédìng","to decide"]],sent:["我一定去。","Wǒ yídìng qù.","I'll definitely go."]},
{c:"与",p:"yǔ",m:"and; with",comp:[],pos:["conj","cov"],story:"The written counterpart of 和 — you'll meet it in titles, signs and formal prose more than in speech.",o:"Simplified from 與: four hands passing something between them. To give, to take part with.",words:[["与其","yǔqí","rather than"]],sent:["中国与日本。","Zhōngguó yǔ Rìběn.","China and Japan."]},
{c:"之",p:"zhī",m:"(classical possessive)",comp:[],pos:["part-str"],story:"The ancestor of 的. It survives in set phrases and formal writing: 三分之一 is 'one third'.",o:"A foot leaving a line — to go. Borrowed as a grammatical particle so early that the motion is long forgotten.",words:[["之后","zhīhòu","after"],["三分之一","sān fēn zhī yī","one third"]],sent:["三分之一的人。","Sān fēn zhī yī de rén.","A third of the people."]},
{c:"于",p:"yú",m:"at; in; to",comp:["二"],pos:["cov"],story:"Formal Chinese for 在 or 给. You'll see it on signs and in writing: 生于1990年.",o:"A breath escaping, marking a pause. It became the all-purpose written preposition.",words:[["对于","duìyú","regarding"],["由于","yóuyú","owing to"]],sent:["他生于北京。","Tā shēng yú Běijīng.","He was born in Beijing."]},
{c:"其",p:"qí",m:"his; its; that",comp:["八"],pos:["pron"],story:"A classical pronoun still everywhere in compounds: 其他 (other), 其中 (among them), 尤其 (especially).",o:"A winnowing basket, drawn with its stand. Borrowed as a pronoun; the basket meaning moved to 箕.",words:[["其他","qítā","other"],["其中","qízhōng","among them"]],sent:["其他人都来了。","Qítā rén dōu lái le.","Everyone else has come."]},
{c:"条",p:"tiáo",m:"(measure: long things)",comp:["木"],pos:["mw","n"],story:"For anything long and winding: 一条鱼, 一条路, 一条河. A twig, extended to every long thin thing.",o:"A tree (木) with a branch. The slender branch became the measure word for slender things.",words:[["一条","yì tiáo","one (long thing)"],["面条","miàntiáo","noodles"]],sent:["这是一条大鱼。","Zhè shì yì tiáo dà yú.","This is a big fish."]},
{c:"张",p:"zhāng",m:"(measure: flat things); to open",comp:[],pos:["mw","v"],story:"For flat sheets: 一张纸, 一张桌子. It's also one of the commonest Chinese surnames.",o:"Simplified from 張: a bow (弓) plus 長 for sound — to draw a bow open. Spreading flat gave the measure word.",words:[["一张","yì zhāng","one (flat thing)"],["紧张","jǐnzhāng","nervous"]],sent:["给我一张纸。","Gěi wǒ yì zhāng zhǐ.","Give me a sheet of paper."]},
{c:"本",p:"běn",m:"root; (measure: books)",comp:["木"],pos:["mw","n"],story:"A tree (木) with a mark at its base — the root. Hence 'origin', and the measure word for books.",o:"A tree with a stroke marking the roots. An indicator character: the mark points at the part meant.",words:[["一本","yì běn","one (book)"],["本来","běnlái","originally"],["日本","Rìběn","Japan"]],sent:["我买了三本书。","Wǒ mǎi le sān běn shū.","I bought three books."]},
{c:"件",p:"jiàn",m:"(measure: items, matters)",comp:["人","牛"],pos:["mw"],story:"Person (亻) plus ox (牛) — dividing up a carcass into pieces. For clothes, matters and items: 一件事.",o:"A person and an ox, read as portioning out. From a portion came 'an item'.",words:[["一件","yí jiàn","one (item)"],["事件","shìjiàn","an incident"]],sent:["我有一件事问你。","Wǒ yǒu yí jiàn shì wèn nǐ.","I've got something to ask you."]},
{c:"位",p:"wèi",m:"(polite measure: people); position",comp:["人","立"],pos:["mw","n"],story:"A person (亻) standing (立) in place. The polite measure word for people — 三位老师, rather than 三个.",o:"A person standing at their appointed spot at court. Hence rank, position, and a respectful way to count people.",words:[["一位","yí wèi","one (person, polite)"],["位子","wèizi","a seat"]],sent:["这位是我的老师。","Zhè wèi shì wǒ de lǎoshī.","This is my teacher."]}
);
HQ.push(
{c:"头",p:"tóu",m:"head; (noun suffix)",comp:["大"],pos:["n"],story:"Simplified from 頭 into something you can write in five strokes. It also tacks onto nouns: 木头, 石头.",o:"Simplified from 頭 (豆 for sound plus 頁, a head). The modern form is a shorthand invented in the 1950s.",words:[["头发","tóufa","hair"],["木头","mùtou","wood"],["外头","wàitou","outside"]],sent:["我头有点疼。","Wǒ tóu yǒudiǎn téng.","My head hurts a bit."]},
{c:"眼",p:"yǎn",m:"eye",comp:["目"],pos:["n"],story:"The eye radical 目 on the left, 艮 for sound. 眼睛 is the everyday word; 目 alone is bookish.",o:"Eye (目) plus 艮 for sound. It named the eyeball specifically, where 目 meant sight in general.",words:[["眼睛","yǎnjing","eye"],["眼前","yǎnqián","before one's eyes"]],sent:["她的眼睛很大。","Tā de yǎnjing hěn dà.","She has big eyes."]},
{c:"身",p:"shēn",m:"body",comp:[],pos:["n"],story:"A person in profile with a swollen belly — the original meaning was 'pregnant'.",o:"A standing figure with a rounded abdomen, first meaning pregnancy, then the body in general.",words:[["身体","shēntǐ","body; health"],["本身","běnshēn","itself"]],sent:["他身体很好。","Tā shēntǐ hěn hǎo.","He's in good health."]},
{c:"体",p:"tǐ",m:"body; form",comp:["人","本"],pos:["n"],story:"Person (亻) plus root (本) — the trunk of a person. The simplified form is far kinder than 體.",o:"Simplified from 體 (bone plus 豊). The replacement 体 was an existing rare character meaning 'coarse', reused for its convenient shape.",words:[["身体","shēntǐ","body"],["体会","tǐhuì","to experience"]],sent:["身体最重要。","Shēntǐ zuì zhòngyào.","Health matters most."]},
{c:"脚",p:"jiǎo",m:"foot",comp:["肉"],pos:["n"],story:"The flesh radical ⺼ (which looks like 月) plus 却. Every body part carries this radical.",o:"Flesh (⺼) plus 却 for sound. The ⺼ here is 肉, not the moon — the usual trap.",words:[["脚下","jiǎoxià","underfoot"],["手脚","shǒujiǎo","hands and feet"]],sent:["我的脚很累。","Wǒ de jiǎo hěn lèi.","My feet are tired."]},
{c:"打",p:"dǎ",m:"to hit; to do",comp:["手"],pos:["v"],story:"The hand radical 扌 plus 丁. Wildly versatile: 打电话 (phone), 打球 (play ball), 打开 (open).",o:"Hand (扌) plus 丁 for sound — to strike. Modern Chinese uses it for dozens of hand-related actions.",words:[["打开","dǎkāi","to open"],["打电话","dǎ diànhuà","make a call"]],sent:["请打开门。","Qǐng dǎkāi mén.","Please open the door."]},
{c:"找",p:"zhǎo",m:"to look for",comp:["手"],pos:["v"],story:"Hand (扌) plus 戈 (a spear) — searching with a weapon in hand. It also means to give change.",o:"Hand (扌) with 戈. A relatively late character; earlier Chinese used 求 and 寻.",words:[["找到","zhǎodào","to find"],["找钱","zhǎoqián","give change"]],sent:["我在找我的手机。","Wǒ zài zhǎo wǒ de shǒujī.","I'm looking for my phone."]},
{c:"拿",p:"ná",m:"to take; to hold",comp:["手"],pos:["v"],story:"合 (to join) over 手 (hand) — closing your hand around something.",o:"A hand joining onto a thing. The 手 sits underneath in full form rather than compressed to 扌.",words:[["拿来","nálái","bring here"],["拿走","názǒu","take away"]],sent:["请拿一个杯子。","Qǐng ná yí gè bēizi.","Please take a cup."]},
{c:"放",p:"fàng",m:"to put; to release",comp:["方"],pos:["v"],story:"方 for sound plus 攵, a hand with a stick. To let go, to set down, to let out.",o:"方 plus the 攴 radical (a hand holding a rod), meaning to drive out. From banishment came releasing and placing.",words:[["放心","fàngxīn","be at ease"],["放学","fàngxué","school lets out"]],sent:["放心，我会来的。","Fàngxīn, wǒ huì lái de.","Don't worry, I'll come."]},
{c:"送",p:"sòng",m:"to give; to see off",comp:["辶"],pos:["v"],story:"Walking radical 辶 — going along with something. It covers gifts, deliveries and walking a guest out.",o:"The walking radical plus 关. To accompany on the way, hence to escort, deliver and present.",words:[["送给","sòng gěi","to give"],["送人","sòng rén","see someone off"]],sent:["我送你回家。","Wǒ sòng nǐ huí jiā.","I'll walk you home."]},
{c:"带",p:"dài",m:"to bring; a belt",comp:["巾"],pos:["v","n"],story:"The cloth radical 巾 at the bottom — a sash. What you wear about you, you carry with you.",o:"Simplified from 帶: a belt with ornaments hanging from it, over the cloth radical 巾.",words:[["带来","dàilái","bring"],["皮带","pídài","belt"]],sent:["请带你的书来。","Qǐng dài nǐ de shū lái.","Please bring your book."]},
{c:"教",p:"jiāo",m:"to teach",comp:["子"],pos:["v"],story:"A child (子) and a hand with a rod (攵) — old-fashioned schooling, drawn plainly. Read jiào it means religion.",o:"A hand with a stick beside a child learning tally marks. The same 爻 appears in 學.",words:[["教书","jiāoshū","to teach"],["教室","jiàoshì","classroom"]],sent:["他教我们中文。","Tā jiāo wǒmen Zhōngwén.","He teaches us Chinese."]},
{c:"帮",p:"bāng",m:"to help",comp:["巾"],pos:["v"],story:"Cloth (巾) below, 邦 for sound. 帮忙 — to help out — literally 'help with the busyness'.",o:"Simplified from 幫: the cloth radical with 封 for sound. It named the upper of a shoe before meaning assistance.",words:[["帮助","bāngzhù","to help"],["帮忙","bāngmáng","lend a hand"]],sent:["请帮我一下。","Qǐng bāng wǒ yíxià.","Please give me a hand."]},
{c:"等",p:"děng",m:"to wait; rank; etc.",comp:["寸"],pos:["v","n"],story:"Bamboo (⺮) over 寺 — sorting bamboo slips into order. Hence rank, and 'and so on'.",o:"Bamboo strips (⺮) being levelled at a temple office (寺). From sorting into grades came waiting one's turn.",words:[["等等","děngděng","etcetera"],["等一下","děng yíxià","wait a moment"]],sent:["请等一下。","Qǐng děng yíxià.","Please wait a moment."]},
{c:"忙",p:"máng",m:"busy",comp:["心"],pos:["adj"],story:"The heart radical 忄 plus 亡 (to lose) — a heart that's lost track of itself. That's busy.",o:"Heart (忄) plus 亡 for sound. The 忄 form is 心 squeezed against a left edge.",words:[["很忙","hěn máng","very busy"],["帮忙","bāngmáng","to help"]],sent:["我今天很忙。","Wǒ jīntiān hěn máng.","I'm very busy today."]},
{c:"累",p:"lèi",m:"tired",comp:["田","纟"],pos:["adj"],story:"A field (田) over silk (糸) — thread piling up, load upon load. Read lěi it means to accumulate.",o:"Bundles tied with cord, stacked. Accumulation became the weight that makes you tired.",words:[["很累","hěn lèi","very tired"],["累了","lèi le","worn out"]],sent:["我今天太累了。","Wǒ jīntiān tài lèi le.","I'm too tired today."]},
{c:"笑",p:"xiào",m:"to laugh; to smile",comp:[],pos:["v"],story:"Bamboo (⺮) over 夭 (a bending figure) — someone doubled over. Bamboo leaves rustle like laughter.",o:"Bamboo above a bent person. One traditional reading is bamboo swaying in the wind, which the Chinese heard as laughter.",words:[["笑话","xiàohua","a joke"],["好笑","hǎoxiào","funny"]],sent:["他笑了。","Tā xiào le.","He laughed."]},
{c:"跑",p:"pǎo",m:"to run",comp:["足"],pos:["v"],story:"The foot radical 足 on the left, 包 for sound. Any character with 足 is about what feet do.",o:"Foot (足) plus 包. A late character — classical Chinese used 走 for running, which now means walking.",words:[["跑步","pǎobù","to jog"],["跑来","pǎolái","come running"]],sent:["他跑得很快。","Tā pǎo de hěn kuài.","He runs very fast."]},
{c:"玩",p:"wán",m:"to play",comp:["王"],pos:["v"],story:"The jade radical 王 plus 元 — turning a jade trinket over in your hands. Amusement, drawn as a plaything.",o:"Jade (玉/王) plus 元 for sound: to toy with a precious object, hence to amuse oneself.",words:[["玩儿","wánr","to play"],["好玩","hǎowán","fun"]],sent:["我们去玩吧。","Wǒmen qù wán ba.","Let's go and have some fun."]},
{c:"睡",p:"shuì",m:"to sleep",comp:["目"],pos:["v"],story:"The eye (目) plus 垂 (to droop) — eyelids sinking. One of the more honest characters in the language.",o:"An eye with something hanging down. It first meant to doze sitting up, then sleep generally.",words:[["睡觉","shuìjiào","to sleep"],["睡着","shuìzháo","fall asleep"]],sent:["我要去睡觉了。","Wǒ yào qù shuìjiào le.","I'm going to bed."]},
{c:"起",p:"qǐ",m:"to rise; to start",comp:["走"],pos:["v"],story:"The running radical 走 — getting up and moving. It tacks onto verbs to mean 'up': 起来, 拿起.",o:"走 (to move on foot) plus 己 for sound. To rise to one's feet, then to begin.",words:[["起来","qǐlái","get up"],["一起","yìqǐ","together"],["起床","qǐchuáng","get out of bed"]],sent:["我们一起去。","Wǒmen yìqǐ qù.","Let's go together."]},
{c:"停",p:"tíng",m:"to stop",comp:["人"],pos:["v"],story:"A person (亻) beside 亭, a pavilion — halting at a rest stop by the road.",o:"A traveller (亻) pausing at a roadside pavilion (亭). The pavilion supplies both sense and sound.",words:[["停车","tíngchē","park a car"],["停下","tíngxià","stop"]],sent:["车停在门口。","Chē tíng zài ménkǒu.","The car is parked by the door."]},
{c:"长",p:"cháng",m:"long; (zhǎng) to grow",comp:[],pos:["adj","v"],story:"A figure with long flowing hair. Two readings worth keeping straight: cháng is long, zhǎng is to grow up — and a chief.",o:"Simplified from 長: a person with streaming hair and a stick. Long hair meant age, hence elder and chief.",words:[["很长","hěn cháng","very long"],["长大","zhǎngdà","grow up"],["校长","xiàozhǎng","headteacher"]],sent:["这条路很长。","Zhè tiáo lù hěn cháng.","This road is long."]},
{c:"短",p:"duǎn",m:"short",comp:["矢"],pos:["adj"],story:"An arrow (矢) plus 豆 (a bean) — two short things measured against each other.",o:"Arrows and beans were used as short measures, against 長 which used a tall figure.",words:[["很短","hěn duǎn","very short"],["短信","duǎnxìn","text message"]],sent:["时间太短了。","Shíjiān tài duǎn le.","There isn't enough time."]},
{c:"高",p:"gāo",m:"tall; high",comp:["口"],pos:["adj"],story:"A tall building on a mound, drawn in storeys. It's also one of the common surnames.",o:"A watchtower on a raised base, seen from the front. The layers are floors.",words:[["高兴","gāoxìng","happy"],["很高","hěn gāo","very tall"]],sent:["很高兴认识你。","Hěn gāoxìng rènshi nǐ.","Pleased to meet you."]},
{c:"快",p:"kuài",m:"fast; soon; pleased",comp:["心"],pos:["adj","adv"],story:"The heart radical 忄 — a heart that's quick. It means fast, and also happy: 快乐.",o:"Heart (忄) plus 夬 for sound. It first meant gladness; speed came from the sense of a heart leaping.",words:[["很快","hěn kuài","very fast"],["快乐","kuàilè","happy"],["快点","kuài diǎn","hurry up"]],sent:["新年快乐！","Xīnnián kuàilè!","Happy New Year!"]},
{c:"慢",p:"màn",m:"slow",comp:["心"],pos:["adj"],story:"Heart radical 忄 again, the partner of 快. 慢走 — 'go slowly' — is how you say goodbye to a departing guest.",o:"Heart (忄) plus 曼 for sound. A slack heart, hence unhurried and, in older use, negligent.",words:[["很慢","hěn màn","very slow"],["慢慢","mànmàn","slowly"]],sent:["请慢慢说。","Qǐng mànmàn shuō.","Please speak slowly."]},
{c:"冷",p:"lěng",m:"cold",comp:[],pos:["adj"],story:"The ice radical 冫 — two strokes, not the three of water 氵. Ice has one drop fewer.",o:"Ice (冫) plus 令 for sound. The two-stroke 冫 is water frozen: 冰, 冻, 凉 all carry it.",words:[["很冷","hěn lěng","very cold"],["冷水","lěngshuǐ","cold water"]],sent:["今天很冷。","Jīntiān hěn lěng.","It's cold today."]},
{c:"热",p:"rè",m:"hot",comp:["火"],pos:["adj"],story:"The four fire dots 灬 underneath. It also means enthusiastic — 热心, warm-hearted.",o:"Simplified from 熱: fire (灬) with 埶 above. The dots are 火 flattened under a character.",words:[["很热","hěn rè","very hot"],["热水","rèshuǐ","hot water"],["热心","rèxīn","warm-hearted"]],sent:["我要一杯热茶。","Wǒ yào yì bēi rè chá.","I'd like a hot tea."]},
{c:"旧",p:"jiù",m:"old (of things)",comp:["日"],pos:["adj"],story:"For things, not people — an old book is 旧书, but an old person is 老人. Getting this wrong is a classic slip.",o:"Simplified from 舊, which had a bird over a mortar. The modern form is a shorthand using 日 and 丨.",words:[["旧书","jiù shū","old book"],["很旧","hěn jiù","worn out"]],sent:["这本书很旧了。","Zhè běn shū hěn jiù le.","This book is very old."]},
{c:"贵",p:"guì",m:"expensive; honoured",comp:["贝"],pos:["adj"],story:"The cowrie-shell radical 贝 at the bottom — money. It also makes polite questions: 您贵姓？",o:"A basket of cowries held in two hands. Wealth, hence costliness and, by courtesy, esteem.",words:[["太贵","tài guì","too expensive"],["贵姓","guìxìng","your surname (polite)"]],sent:["这个太贵了。","Zhège tài guì le.","This is too expensive."]},
{c:"难",p:"nán",m:"difficult",comp:["隹"],pos:["adj"],story:"The short-tailed bird 隹 on the right. Read nàn it means a disaster.",o:"Simplified from 難: a bird (隹) plus 堇. It named a bird before being borrowed for hardship.",words:[["很难","hěn nán","very hard"],["难过","nánguò","sad"],["难看","nánkàn","ugly"]],sent:["中文很难，但很有意思。","Zhōngwén hěn nán, dàn hěn yǒu yìsi.","Chinese is hard, but fascinating."]}
);
HQ.push(
{c:"便",p:"biàn",m:"convenient; (pián) cheap",comp:["人"],pos:["adj"],story:"Two readings worth separating: 方便 (fāngbiàn) is convenient, 便宜 (piányi) is cheap.",o:"A person (亻) plus 更 (to change) — altering something to suit. Hence convenience.",words:[["方便","fāngbiàn","convenient"],["便宜","piányi","cheap"]],sent:["这个很便宜。","Zhège hěn piányi.","This one is cheap."]},
{c:"宜",p:"yí",m:"suitable",comp:[],pos:["adj"],story:"A roof over stacked meat — a well-stocked house is a fitting one. It lives mostly inside 便宜.",o:"Meat on an altar under a roof, an offering that is fitting. From propriety came suitability.",words:[["便宜","piányi","cheap"],["合宜","héyí","appropriate"]],sent:["水果很便宜。","Shuǐguǒ hěn piányi.","The fruit is cheap."]},
{c:"红",p:"hóng",m:"red",comp:["纟","工"],pos:["adj"],story:"Silk (纟) plus 工 — dyed cloth. Colour words carry the silk radical because colour meant dyed fabric.",o:"Silk (糸) with 工 for sound. It named a pink-red dye before covering red in general.",words:[["红色","hóngsè","red"],["红茶","hóngchá","black tea"]],sent:["我喜欢红色。","Wǒ xǐhuan hóngsè.","I like red."]},
{c:"黄",p:"huáng",m:"yellow",comp:[],pos:["adj"],story:"A figure with a jade ornament at the waist. The Yellow River, 黄河, gave China its cradle.",o:"Probably a person wearing a ceremonial jade disc. The colour meaning is ancient and its origin disputed.",words:[["黄色","huángsè","yellow"],["黄瓜","huángguā","cucumber"]],sent:["那些花是黄色的。","Nàxiē huā shì huángsè de.","Those flowers are yellow."]},
{c:"蓝",p:"lán",m:"blue",comp:[],pos:["adj"],story:"The grass radical 艹 on top — blue came from the indigo plant, so the character grows out of a leaf.",o:"Simplified from 藍: grass (艸) plus 監 for sound. It named the indigo plant, then its colour.",words:[["蓝色","lánsè","blue"],["天蓝","tiānlán","sky blue"]],sent:["天是蓝的。","Tiān shì lán de.","The sky is blue."]},
{c:"绿",p:"lǜ",m:"green",comp:["纟"],pos:["adj"],story:"Silk (纟) again — another dye. 绿茶 is green tea, which in China simply means unoxidised leaf.",o:"Simplified from 綠: silk (糸) plus 彔 for sound. A colour named after the dyed thread.",words:[["绿色","lǜsè","green"],["绿茶","lǜchá","green tea"]],sent:["我要一杯绿茶。","Wǒ yào yì bēi lǜchá.","I'd like a green tea."]},
{c:"黑",p:"hēi",m:"black",comp:["火"],pos:["adj"],story:"A face blackened by soot over a fire (灬 at the base). Chinese ink itself is lamp-black.",o:"A person's face marked with soot above a fire. The four dots are flames.",words:[["黑色","hēisè","black"],["黑板","hēibǎn","blackboard"]],sent:["他的头发很黑。","Tā de tóufa hěn hēi.","His hair is very black."]},
{c:"色",p:"sè",m:"colour",comp:[],pos:["n"],story:"Suffixes every colour: 红色, 蓝色, 黑色. On its own it can also mean a facial expression.",o:"A person bent over another — the colour of a face, hence complexion, then colour in general.",words:[["颜色","yánsè","colour"],["红色","hóngsè","red"]],sent:["你喜欢什么颜色？","Nǐ xǐhuan shénme yánsè?","What colour do you like?"]},
{c:"风",p:"fēng",m:"wind",comp:[],pos:["n"],story:"Simplified from 風, which had an insect inside — the ancients thought wind carried living things.",o:"風 contained 虫, from a belief that winds bore creatures. The simplified 风 keeps the envelope and drops the insect.",words:[["大风","dàfēng","strong wind"],["风景","fēngjǐng","scenery"]],sent:["今天风很大。","Jīntiān fēng hěn dà.","It's very windy today."]},
{c:"雨",p:"yǔ",m:"rain",comp:[],pos:["n"],story:"Drops falling from a cloud under the sky-line. It heads every weather character: 雪, 雷, 云.",o:"Water falling from a cloud, drawn exactly as it looks. One of the clearest pictographs still in use.",words:[["下雨","xiàyǔ","to rain"],["大雨","dàyǔ","heavy rain"]],sent:["今天下雨了。","Jīntiān xiàyǔ le.","It rained today."]},
{c:"雪",p:"xuě",m:"snow",comp:["雨"],pos:["n"],story:"Rain (雨) over a hand — snow is the rain you can hold. 雪白 means snow-white.",o:"The rain radical over 彗 (a broom), later simplified to a hand. Snow is rain you can sweep.",words:[["下雪","xiàxuě","to snow"],["雪白","xuěbái","snow-white"]],sent:["北方冬天下雪。","Běifāng dōngtiān xiàxuě.","It snows in the north in winter."]},
{c:"云",p:"yún",m:"cloud",comp:["二"],pos:["n"],story:"A curl of vapour under the sky. The traditional 雲 added rain on top; simplification restored the older, barer form.",o:"A spiral of rising vapour. 雲 added 雨 later; simplified Chinese went back to the oracle-bone shape.",words:[["白云","báiyún","white cloud"],["云南","Yúnnán","Yunnan province"]],sent:["天上有白云。","Tiānshàng yǒu báiyún.","There are white clouds in the sky."]},
{c:"花",p:"huā",m:"flower; to spend",comp:["人"],pos:["n","v"],story:"The grass radical 艹 plus 化 for sound. It also means to spend money — 花钱.",o:"Grass (艸) over 化 (to transform), because a bud transforms into a bloom.",words:[["花钱","huāqián","spend money"],["花园","huāyuán","garden"]],sent:["我买了一些花。","Wǒ mǎi le yìxiē huā.","I bought some flowers."]},
{c:"草",p:"cǎo",m:"grass",comp:["日","十"],pos:["n"],story:"The grass radical 艹 over 早 (early). The radical it carries is a compressed picture of itself.",o:"Grass (艸) with 早 for sound. 艹 is 艸 — two sprouts — squashed flat above a character.",words:[["草地","cǎodì","lawn"],["花草","huācǎo","plants"]],sent:["这里的草很绿。","Zhèlǐ de cǎo hěn lǜ.","The grass here is very green."]},
{c:"树",p:"shù",m:"tree",comp:["木","寸"],pos:["n"],story:"Wood (木) plus 对 — a planted tree, as against 木 which is timber generally.",o:"Simplified from 樹: wood (木), a hand (寸) and 壴. To set a tree upright in the ground.",words:[["大树","dàshù","a big tree"],["树木","shùmù","trees"]],sent:["门口有一棵大树。","Ménkǒu yǒu yì kē dàshù.","There's a big tree by the door."]},
{c:"校",p:"xiào",m:"school",comp:["木"],pos:["n"],story:"Wood (木) plus 交 — the wooden frame of a school compound. It almost always appears in 学校.",o:"Wood (木) with 交 for sound. It first named a wooden enclosure or stocks, then a place of instruction.",words:[["学校","xuéxiào","school"],["校长","xiàozhǎng","headteacher"]],sent:["我们的学校很大。","Wǒmen de xuéxiào hěn dà.","Our school is big."]},
{c:"院",p:"yuàn",m:"courtyard; institution",comp:[],pos:["n"],story:"The mound radical 阝 on the left — a walled yard. It names institutions: 医院, 学院, 法院.",o:"The mound/wall radical 阜 (written 阝) plus 完 for sound. A walled enclosure.",words:[["医院","yīyuàn","hospital"],["学院","xuéyuàn","college"]],sent:["医院在前面。","Yīyuàn zài qiánmiàn.","The hospital is up ahead."]},
{c:"室",p:"shì",m:"room",comp:[],pos:["n"],story:"A roof over 至 (to arrive) — the room you arrive at. Formal: 教室, 办公室.",o:"A roof (宀) over 至, an arrow landing. The place you come to rest, hence an inner room.",words:[["教室","jiàoshì","classroom"],["办公室","bàngōngshì","office"]],sent:["教室在二楼。","Jiàoshì zài èr lóu.","The classroom is on the second floor."]},
{c:"房",p:"fáng",m:"house; room",comp:["方"],pos:["n"],story:"The door radical 户 on top, 方 for sound. 房子 is a house; 房间 is a room.",o:"A door (戶) with 方 for sound. It first meant a side chamber off the main hall.",words:[["房子","fángzi","house"],["房间","fángjiān","room"]],sent:["他的房子很大。","Tā de fángzi hěn dà.","His house is big."]},
{c:"楼",p:"lóu",m:"floor; building",comp:["木","女"],pos:["n"],story:"Wood (木) — buildings were timber. It counts storeys: 三楼 is the third floor.",o:"Simplified from 樓: wood (木) plus 婁 for sound. A multi-storey timber building.",words:[["一楼","yī lóu","ground floor"],["大楼","dàlóu","a large building"],["上楼","shànglóu","go upstairs"]],sent:["我住在三楼。","Wǒ zhù zài sān lóu.","I live on the third floor."]},
{c:"街",p:"jiē",m:"street",comp:["土"],pos:["n"],story:"The crossroads radical 行 wrapped around 圭 — a street is a road with buildings on both sides.",o:"行 (a crossroads, seen from above) enclosing 圭. The radical is literally a junction of two roads.",words:[["大街","dàjiē","main street"],["街上","jiēshang","in the street"]],sent:["街上人很多。","Jiēshang rén hěn duō.","There are a lot of people in the street."]},
{c:"市",p:"shì",m:"city; market",comp:["巾"],pos:["n"],story:"Cloth (巾) below — a market is where cloth is traded. Now it also means a city: 北京市.",o:"A marker over the cloth radical 巾, indicating a place of trade. Markets grew into cities.",words:[["城市","chéngshì","city"],["市场","shìchǎng","market"],["超市","chāoshì","supermarket"]],sent:["这个城市很大。","Zhège chéngshì hěn dà.","This city is large."]},
{c:"场",p:"chǎng",m:"field; place",comp:["土"],pos:["n","mw"],story:"Earth (土) plus 汤's right half — a flat open ground. 机场 is an airport, 市场 a market.",o:"Simplified from 場: earth (土) plus 昜 for sound. A levelled patch of ground for threshing.",words:[["市场","shìchǎng","market"],["机场","jīchǎng","airport"]],sent:["机场很远。","Jīchǎng hěn yuǎn.","The airport is far away."]},
{c:"园",p:"yuán",m:"garden; park",comp:["囗"],pos:["n"],story:"A wall (囗) around 元 — an enclosed piece of ground. 公园 is a park, 花园 a garden.",o:"Simplified from 園: an enclosure (囗) with 袁 for sound. A walled plot for growing things.",words:[["公园","gōngyuán","park"],["花园","huāyuán","garden"]],sent:["我们去公园吧。","Wǒmen qù gōngyuán ba.","Let's go to the park."]},
{c:"医",p:"yī",m:"medicine; doctor",comp:["矢"],pos:["n","v"],story:"An arrow (矢) inside a box — the traditional 醫 showed arrows, a hand and a wine jar, which is roughly Bronze Age surgery.",o:"Simplified from 醫: a quiver of arrows, a hand with a tool, and 酉 (wine, as antiseptic). The simplified form keeps only the quiver.",words:[["医生","yīshēng","doctor"],["医院","yīyuàn","hospital"]],sent:["我要看医生。","Wǒ yào kàn yīshēng.","I need to see a doctor."]},
{c:"银",p:"yín",m:"silver",comp:["钅"],pos:["n"],story:"The metal radical 钅 plus 艮. 银行 — literally 'silver business' — is a bank.",o:"Metal (金) plus 艮 for sound. Silver was the currency metal, so banking took its name.",words:[["银行","yínháng","bank"],["银色","yínsè","silver"]],sent:["银行在街对面。","Yínháng zài jiē duìmiàn.","The bank is across the street."]},
{c:"行",p:"xíng",m:"to go; alright; (háng) a row",comp:[],pos:["v","adj","n"],story:"A crossroads seen from above. As xíng it means to go, and 行！means 'fine, OK'. As háng it's a row or a trade — 银行, a bank.",o:"Two roads crossing, drawn from overhead. It is also a radical, wrapping around characters like 街.",words:[["银行","yínháng","bank"],["不行","bùxíng","no good"],["旅行","lǚxíng","to travel"]],sent:["这样行吗？","Zhèyàng xíng ma?","Is this alright?"]},
{c:"病",p:"bìng",m:"illness; to be ill",comp:[],pos:["n","v"],story:"The sickness radical 疒 — a person on a bed, tilted. Every illness character carries it.",o:"The 疒 radical is a person lying against a bed frame, plus 丙 for sound.",words:[["生病","shēngbìng","fall ill"],["看病","kànbìng","see a doctor"]],sent:["他生病了。","Tā shēngbìng le.","He's fallen ill."]},
{c:"药",p:"yào",m:"medicine",comp:[],pos:["n"],story:"The grass radical 艹 — medicine was herbs first. 中药 is traditional Chinese medicine.",o:"Simplified from 藥: grass (艸) over 樂 (music), because herbs were held to bring the body back into harmony.",words:[["中药","zhōngyào","Chinese medicine"],["吃药","chīyào","take medicine"]],sent:["请按时吃药。","Qǐng ànshí chīyào.","Please take your medicine on time."]},
);

/* ---------- Stage 9 · 交流 Connect ----------
   Language, study, screens and the vocabulary of thinking. Everything here is
   built on stages 1-8: 视 comes from 见 taught four entries earlier, 意 from
   音, 息 from 自, 记 from 己. The cluster is ordered so no character needs a
   part you have not already met. */
HQ.push(
{c:"见",p:"jiàn",m:"to see; to meet",comp:[],pos:["v"],story:"An eye on a pair of legs — a person who has gone to look. Walking eyes. It hides inside 视 and 觉 later in this stage.",o:"Oracle bones draw a kneeling figure with an oversized eye. The eye is the whole point of the drawing: this is a person in the act of seeing.",words:[["看见","kànjiàn","to see"],["再见","zàijiàn","goodbye"],["见面","jiànmiàn","to meet up"]],sent:["明天见！","Míngtiān jiàn!","See you tomorrow!"]},
{c:"谢",p:"xiè",m:"to thank",comp:["讠","身"],pos:["v"],story:"Words (讠) beside a body drawing a bow — thanks offered and then withdrawn. Doubled, it is the first phrase anyone learns: 谢谢.",o:"Speech plus 射 to shoot. The original sense was to decline or take one's leave — words that release you from an obligation. Gratitude came afterwards.",words:[["谢谢","xièxie","thank you"],["感谢","gǎnxiè","to be grateful"],["不谢","bú xiè","don't mention it"]],sent:["我要谢谢你。","Wǒ yào xièxie nǐ.","I want to thank you."]},
{c:"您",p:"nín",m:"you (polite)",comp:["你","心"],pos:["pron"],story:"你 with a heart (心) set underneath — the same you, said with the heart behind it. For teachers, elders, and anyone you would rather not offend.",o:"A northern politeness that stuck: 你 with 心 added beneath. The heart is the courtesy.",words:[["您好","nín hǎo","hello (polite)"],["请问您","qǐng wèn nín","may I ask you (polite)"]],sent:["您好，老师。","Nín hǎo, lǎoshī.","Hello, teacher."]},
{c:"认",p:"rèn",m:"to recognise",comp:["讠","人"],pos:["v"],story:"Words (讠) and a person (人) — putting a name to a face. 认识 is knowing a person, not knowing a fact.",o:"Speech beside 人. To acknowledge someone aloud, to own that you know them.",words:[["认识","rènshi","to know (a person)"],["认为","rènwéi","to think, to reckon"],["认真","rènzhēn","conscientious"]],sent:["很高兴认识你。","Hěn gāoxìng rènshi nǐ.","Pleased to meet you."]},
{c:"识",p:"shí",m:"to know",comp:["讠","口"],pos:["v"],story:"Words (讠) once more, this time with 只 — knowledge you can put into speech. It travels almost everywhere with 认.",o:"The full form 識 has 戠 for sound beside 言. The simplified 只 is a sound borrowing, carrying no meaning of its own.",words:[["认识","rènshi","to know; to recognise"],["知识","zhīshi","knowledge"]],sent:["这个字我不认识。","Zhège zì wǒ bú rènshi.","I don't know this character."]},
{c:"自",p:"zì",m:"self; from",comp:["目"],pos:["pron","cov"],story:"A nose, drawn straight on. Chinese speakers point at their own nose to mean me — so the nose became the word for self.",o:"A pictograph of a nose. It was borrowed for self so completely that 鼻 had to be invented to mean nose again.",words:[["自己","zìjǐ","oneself"],["自行车","zìxíngchē","bicycle"],["来自","láizì","to come from"]],sent:["我自己做饭。","Wǒ zìjǐ zuò fàn.","I cook for myself."]},
{c:"己",p:"jǐ",m:"oneself",comp:[],pos:["pron"],story:"A bent cord, borrowed long ago for self. You will meet it almost only in 自己 — and inside 记, three entries along.",o:"Originally knotted cord used for keeping records. The self meaning is a sound borrowing that never let go.",words:[["自己","zìjǐ","oneself"],["知己","zhījǐ","a close friend"]],sent:["这是我自己的。","Zhè shì wǒ zìjǐ de.","This is my own."]},
{c:"思",p:"sī",m:"to think",comp:["田","心"],pos:["v","n"],story:"A field (田) over a heart (心) — the mind laid out in rows and worked over. The 田 was originally 囟, the crown of the skull.",o:"Skull above heart. Old Chinese located thinking in both: the head to hold it, the heart to feel it.",words:[["意思","yìsi","meaning"],["思想","sīxiǎng","thought"],["思考","sīkǎo","to think over"]],sent:["这是什么意思？","Zhè shì shénme yìsi?","What does this mean?"]},
{c:"忘",p:"wàng",m:"to forget",comp:["心"],pos:["v"],story:"亡 lost, over 心 heart — something has gone missing from the heart. That is forgetting.",o:"亡 to perish or be lost, above 心. What the heart has mislaid.",words:[["忘记","wàngjì","to forget"],["别忘了","bié wàng le","don't forget"]],sent:["我忘了他的名字。","Wǒ wàng le tā de míngzi.","I forgot his name."]},
{c:"记",p:"jì",m:"to record; to remember",comp:["讠","己"],pos:["v"],story:"Words (讠) tied to a cord (己) — speech knotted so it can be found again. Writing something down so it keeps.",o:"Speech beside 己, the knotted cord once used for records. To fix words so they hold.",words:[["忘记","wàngjì","to forget"],["记得","jìde","to remember"],["日记","rìjì","diary"]],sent:["我记得那个地方。","Wǒ jìde nàge dìfang.","I remember that place."]},
{c:"息",p:"xī",m:"breath; to rest",comp:["自","心"],pos:["n","v"],story:"A nose (自) over a heart (心) — breath. Rest is what happens when you let the breath settle.",o:"Nose above heart: breathing. From breath came pause, and from pause came rest.",words:[["休息","xiūxi","to rest"],["消息","xiāoxi","news"]],sent:["我们休息一下。","Wǒmen xiūxi yíxià.","Let's rest for a bit."]},
{c:"休",p:"xiū",m:"to rest",comp:["人","木"],pos:["v"],story:"A person (亻) leaning on a tree (木). The whole idea, in six strokes.",o:"One of the clearest compound ideographs in the language: a man against a tree, resting in the shade.",words:[["休息","xiūxi","to rest"],["休假","xiūjià","to take leave"]],sent:["星期天我在家休息。","Xīngqītiān wǒ zài jiā xiūxi.","On Sunday I rest at home."]},
{c:"音",p:"yīn",m:"sound",comp:["立","日"],pos:["n"],story:"言 speech, with one extra stroke through the mouth — a sound made, but not yet a word.",o:"言 with a line added in the mouth. The two were once a single character; the stroke split sound off from speech.",words:[["声音","shēngyīn","sound, voice"],["音乐","yīnyuè","music"],["发音","fāyīn","pronunciation"]],sent:["这个音很难。","Zhège yīn hěn nán.","This sound is difficult."]},
{c:"意",p:"yì",m:"meaning; intention",comp:["音","心"],pos:["n"],story:"Sound (音) over heart (心) — what the heart meant by the noise it made. 意思 pairs it with 思 so both halves of thinking are present.",o:"Sound above heart: the intent behind an utterance, as opposed to the utterance itself.",words:[["意思","yìsi","meaning"],["愿意","yuànyì","to be willing"],["注意","zhùyì","to pay attention"]],sent:["我不明白你的意思。","Wǒ bù míngbai nǐ de yìsi.","I don't understand what you mean."]},
{c:"觉",p:"jué",m:"to feel; (jiào) sleep",comp:["小","见"],pos:["v","n"],story:"见 see, with a lid over it — perception turned inward. Read jué it is feeling; read jiào it is the sleep you 睡.",o:"學 and 覺 share a top element; beneath it sits 見. To perceive — which in the second reading slid into the state where perceiving stops.",words:[["觉得","juéde","to feel, to think"],["睡觉","shuìjiào","to sleep"],["感觉","gǎnjué","a feeling"]],sent:["我觉得很累。","Wǒ juéde hěn lèi.","I feel very tired."]},
{c:"书",p:"shū",m:"book",comp:[],pos:["n"],story:"A hand gripping a brush over a page — the full form 書 shows it plainly. The simplified one keeps the sweep of the stroke.",o:"聿, a hand holding a brush, over 者 for sound. First the act of writing, then the thing written.",words:[["书店","shūdiàn","bookshop"],["读书","dúshū","to read; to study"],["看书","kànshū","to read"]],sent:["我在看一本书。","Wǒ zài kàn yì běn shū.","I'm reading a book."]},
{c:"文",p:"wén",m:"writing; culture",comp:[],pos:["n"],story:"A person with marks across the chest — tattooed lines. The oldest meaning is pattern, and writing is the pattern we kept.",o:"A standing figure with crossed markings on the chest. From decorative pattern to script, and from script to culture itself.",words:[["中文","zhōngwén","Chinese (language)"],["英文","yīngwén","English (written)"],["文字","wénzì","writing, script"]],sent:["我在学中文。","Wǒ zài xué zhōngwén.","I'm learning Chinese."]},
{c:"汉",p:"hàn",m:"Han; Chinese",comp:["水","又"],pos:["n"],story:"Water (氵) and a hand (又) — the Han River. The dynasty took its name from the river, the people from the dynasty, and the script from the people: 汉字.",o:"氵 for the Han River with a phonetic beside it. The name travelled from water to dynasty to ethnicity to writing system.",words:[["汉字","hànzì","Chinese character"],["汉语","hànyǔ","Chinese language"],["汉人","hànrén","Han Chinese"]],sent:["汉字很有意思。","Hànzì hěn yǒu yìsi.","Chinese characters are very interesting."]},
{c:"语",p:"yǔ",m:"language",comp:["讠","五","口"],pos:["n"],story:"Words (讠) with 吾 I — speech that has a speaker behind it. Language, as opposed to noise.",o:"The speech radical with 吾 for sound. Language in the sense of a tongue that people share.",words:[["汉语","hànyǔ","Chinese language"],["英语","yīngyǔ","English language"],["语言","yǔyán","language"]],sent:["你会说几种语言？","Nǐ huì shuō jǐ zhǒng yǔyán?","How many languages do you speak?"]},
{c:"英",p:"yīng",m:"outstanding; England",comp:["大"],pos:["n","adj"],story:"Grass (艹) over 央 centre — the flower at the top of the stalk. The best of the crop; and by sound alone, England.",o:"艸 plant over 央 for sound. The blossom, hence excellence. Its use for Britain is purely phonetic.",words:[["英语","yīngyǔ","English language"],["英国","yīngguó","Britain"],["英文","yīngwén","English (written)"]],sent:["她的英语很好。","Tā de yīngyǔ hěn hǎo.","Her English is very good."]},
{c:"美",p:"měi",m:"beautiful; America",comp:["羊","大"],pos:["adj","n"],story:"A big (大) sheep (羊) — a fat ram was the finest thing a herder could show you. Beauty, measured in livestock.",o:"羊 over 大. A large sheep: good to eat, good to own, and so fine in general.",words:[["美国","měiguó","the United States"],["美食","měishí","fine food"],["很美","hěn měi","very beautiful"]],sent:["这个地方很美。","Zhège dìfang hěn měi.","This place is beautiful."]},
{c:"笔",p:"bǐ",m:"pen; brush",comp:[],pos:["n"],story:"Bamboo (⺮) over hair (毛) — a tuft of hair bound into a bamboo tube. That is exactly what a writing brush is.",o:"The simplified form spells out the object: bamboo shaft, hair tip. The full form 筆 uses 聿, the hand-and-brush, instead.",words:[["铅笔","qiānbǐ","pencil"],["毛笔","máobǐ","writing brush"],["笔记","bǐjì","notes"]],sent:["这是我的笔。","Zhè shì wǒ de bǐ.","This is my pen."]},
{c:"纸",p:"zhǐ",m:"paper",comp:["纟"],pos:["n"],story:"Silk (纟) beside 氏 — the first paper was rag and plant fibre beaten flat. The thread radical remembers the rags.",o:"糸 silk with 氏 for sound. Paper was invented in Han China from bark, hemp and worn-out cloth.",words:[["报纸","bàozhǐ","newspaper"],["白纸","báizhǐ","blank paper"]],sent:["请给我一张纸。","Qǐng gěi wǒ yì zhāng zhǐ.","Please give me a sheet of paper."]},
{c:"考",p:"kǎo",m:"to test; to examine",comp:[],pos:["v"],story:"老 old, bent over a stick — the elder who tests you. 考试 is the exam; 思考 is thinking hard about anything.",o:"老 abbreviated over a phonetic. It once meant a deceased father, then to investigate thoroughly, then to examine.",words:[["考试","kǎoshì","exam"],["高考","gāokǎo","university entrance exam"],["思考","sīkǎo","to think over"]],sent:["明天有考试。","Míngtiān yǒu kǎoshì.","There's an exam tomorrow."]},
{c:"试",p:"shì",m:"to try; to test",comp:["讠","工"],pos:["v"],story:"Words (讠) with 式 form — holding something up to the standard to see if it fits. Try it.",o:"Speech plus 式 pattern or model. To measure a thing against the model: to test.",words:[["考试","kǎoshì","exam"],["试试","shìshi","to give it a try"]],sent:["你试试这个。","Nǐ shìshi zhège.","Give this a try."]},
{c:"懂",p:"dǒng",m:"to understand",comp:["心","里"],pos:["v"],story:"Heart (忄) beside 董 — understanding kept in the heart rather than the head. 听懂 is hearing and getting it; 看懂 is reading and getting it.",o:"忄 heart with 董 for sound. A late character for a very old idea.",words:[["听懂","tīngdǒng","to understand by hearing"],["看懂","kàndǒng","to understand by reading"],["懂了","dǒng le","got it"]],sent:["我听不懂。","Wǒ tīng bu dǒng.","I can't understand what I'm hearing."]},
{c:"电",p:"diàn",m:"electricity",comp:[],pos:["n"],story:"Rain with a lightning bolt beneath it — the full form 電 keeps the rain. What survives is the strike itself.",o:"雨 rain over 申, a drawing of forked lightning. Simplification dropped the cloud and kept the bolt.",words:[["电话","diànhuà","telephone"],["电影","diànyǐng","film"],["电脑","diànnǎo","computer"]],sent:["电话在那里。","Diànhuà zài nàli.","The phone is over there."]},
{c:"话",p:"huà",m:"speech; words",comp:["讠","口"],pos:["n"],story:"Words (讠) and a tongue (舌) — speech as the thing a tongue makes. 说话 is to talk; 电话 is electric talk.",o:"The speech radical with 舌 tongue. Talk, and then any stretch of it: a language, a remark, a story.",words:[["电话","diànhuà","telephone"],["说话","shuōhuà","to speak"],["中国话","zhōngguóhuà","spoken Chinese"]],sent:["我想给他打电话。","Wǒ xiǎng gěi tā dǎ diànhuà.","I want to call him."]},
{c:"视",p:"shì",m:"to look at; to regard",comp:["见"],pos:["v"],story:"An altar (礻) beside 见 see — looking with attention, the way you would look at something sacred. 电视 is electric looking.",o:"示 altar or to show, with 見. To regard or inspect: a more deliberate word than 看.",words:[["电视","diànshì","television"],["视力","shìlì","eyesight"]],sent:["他在看电视。","Tā zài kàn diànshì.","He's watching television."]},
{c:"影",p:"yǐng",m:"shadow; film",comp:["日"],pos:["n"],story:"景 a bright view, with three strokes of light beside it — the marks a lit scene throws. A shadow, and then a moving picture.",o:"景 bright scenery plus 彡, the mark of pattern or light. Shadow, reflection, and finally cinema.",words:[["电影","diànyǐng","film, movie"],["影子","yǐngzi","a shadow"]],sent:["我喜欢看电影。","Wǒ xǐhuan kàn diànyǐng.","I like watching films."]},
{c:"脑",p:"nǎo",m:"brain",comp:["肉"],pos:["n"],story:"Flesh (⺼) beside a skull with hair on top — the meat inside your head. 电脑 is an electric one.",o:"⺼ flesh with an element depicting skull and hair. The organ, then the mind, then the computer.",words:[["电脑","diànnǎo","computer"],["头脑","tóunǎo","brains, mind"]],sent:["我的电脑很旧。","Wǒ de diànnǎo hěn jiù.","My computer is very old."]},
{c:"机",p:"jī",m:"machine; opportunity",comp:["木","几"],pos:["n"],story:"Wood (木) beside 几 a low table — the wooden frame of a loom. Every machine since has inherited the word.",o:"木 with 几 for sound. Originally the loom, the most intricate wooden device there was; now any machine, and by extension the moment a mechanism turns: opportunity.",words:[["手机","shǒujī","mobile phone"],["飞机","fēijī","aeroplane"],["机会","jīhuì","opportunity"]],sent:["这是我的手机。","Zhè shì wǒ de shǒujī.","This is my mobile phone."]},
{c:"网",p:"wǎng",m:"net; the internet",comp:[],pos:["n"],story:"A net drawn as a net — the frame, and the mesh stretched inside it. Three thousand years on, it means the internet.",o:"A pictograph of a hunting net on its frame. One of the few characters whose modern meaning needed no new character at all.",words:[["上网","shàngwǎng","to go online"],["网上","wǎngshàng","online"],["网站","wǎngzhàn","website"]],sent:["我在网上买东西。","Wǒ zài wǎngshàng mǎi dōngxi.","I buy things online."]},
{c:"乐",p:"lè",m:"happy; (yuè) music",comp:["小"],pos:["adj","n"],story:"The full form 樂 draws silk strings over a wooden stand — an instrument. Music, and the mood music is for.",o:"Strings on a wooden frame. Read yuè it is music; read lè it is the joy that music exists to produce.",words:[["快乐","kuàilè","happy"],["音乐","yīnyuè","music"],["乐意","lèyì","glad to"]],sent:["生日快乐！","Shēngrì kuàilè!","Happy birthday!"]},
{c:"班",p:"bān",m:"class; work shift",comp:["王","刀"],pos:["n"],story:"Two pieces of jade (王王) with a knife (刂) between them — something precious divided into shares. From shares came groups: a class, a shift, a squad.",o:"Two 玉 jade split by 刀. To divide something valuable into portions, hence any group formed by that division.",words:[["上班","shàngbān","to go to work"],["下班","xiàbān","to finish work"],["班上","bānshàng","in class"]],sent:["我八点上班。","Wǒ bā diǎn shàngbān.","I start work at eight."]},
{c:"司",p:"sī",m:"to manage; office",comp:["口"],pos:["v","n"],story:"A mouth (口) under a bent frame — an official issuing orders. 公司 is a public office: a company.",o:"A hand-and-mouth figure, mirrored from 后. One who gives commands; hence to administer, and the body that does the administering.",words:[["公司","gōngsī","company"],["司机","sījī","driver"]],sent:["他在一家公司工作。","Tā zài yì jiā gōngsī gōngzuò.","He works at a company."]},
{c:"经",p:"jīng",m:"to pass through; already",comp:["纟","工"],pos:["v","adv"],story:"Silk (纟) with the warp of a loom — the long threads everything else crosses. What runs through: experience, scripture, and 已经 already.",o:"糸 with 巠 an underground watercourse. The warp of a fabric, then anything running lengthwise through: a classic text, a meridian, a life.",words:[["已经","yǐjīng","already"],["经常","jīngcháng","often"],["经过","jīngguò","to pass by"]],sent:["我已经吃了。","Wǒ yǐjīng chī le.","I've already eaten."]},
{c:"常",p:"cháng",m:"often; usual",comp:["小","口"],pos:["adv","adj"],story:"尚 over 巾 cloth — a long banner, always hanging there. From permanence came what is ordinary.",o:"巾 cloth with 尚 for sound. Originally a long skirt or banner; the constancy of the thing gave ordinary and constant.",words:[["经常","jīngcháng","often"],["非常","fēicháng","extremely"],["常常","chángcháng","frequently"]],sent:["我常常来这里。","Wǒ chángcháng lái zhèli.","I come here often."]},
{c:"非",p:"fēi",m:"not; non-",comp:[],pos:["adv"],story:"Two wings beating away from each other — going apart. From opposition came negation: not this, non-that.",o:"A pictograph of a bird's wings facing opposite ways. Divergence, then wrongness, then plain negation.",words:[["非常","fēicháng","extremely"],["是非","shìfēi","right and wrong"]],sent:["这个菜非常好吃。","Zhège cài fēicháng hǎochī.","This dish is extremely tasty."]},
{c:"完",p:"wán",m:"to finish; complete",comp:["二"],pos:["v","adj"],story:"A roof (宀) over 元 the whole — a house with everything under it. Complete.",o:"宀 roof with 元 for sound. Intact and entire; then the act of bringing something to that state.",words:[["完成","wánchéng","to complete"],["吃完","chīwán","to finish eating"],["做完","zuòwán","to finish doing"]],sent:["我做完了。","Wǒ zuò wán le.","I've finished."]},
{c:"始",p:"shǐ",m:"to begin",comp:["女","口"],pos:["v"],story:"A woman (女) with 台 — birth as the model for every beginning. 开始 is the one you will actually use.",o:"女 with 台 for sound. The earliest sense is the origin or first cause; to begin follows straight from it.",words:[["开始","kāishǐ","to begin"],["始终","shǐzhōng","from start to finish"]],sent:["电影开始了。","Diànyǐng kāishǐ le.","The film has started."]},
{c:"动",p:"dòng",m:"to move",comp:["云","力"],pos:["v"],story:"云 beside 力 strength — force applied. Anything that strength makes shift.",o:"The full form 動 is 力 strength with 重 heavy for sound. Simplified to 云 plus 力, which reads almost as well: effort putting something in motion.",words:[["运动","yùndòng","sport, exercise"],["动物","dòngwù","animal"],["不动","bú dòng","motionless"]],sent:["别动！","Bié dòng!","Don't move!"]},
{c:"活",p:"huó",m:"to live; alive",comp:["水","口"],pos:["v","adj"],story:"Water (氵) beside a tongue (舌) — a tongue wet enough to speak with. That is what being alive looks like.",o:"氵 with 舌. The original sense is the gurgle of running water; flowing, and so living.",words:[["生活","shēnghuó","life; to live"],["活动","huódòng","an activity"],["生活费","shēnghuófèi","living costs"]],sent:["他的生活很忙。","Tā de shēnghuó hěn máng.","His life is very busy."]},
{c:"飞",p:"fēi",m:"to fly",comp:[],pos:["v"],story:"A wing and the line of a body, going up. The simplified form keeps one wing and all of the lift.",o:"A pictograph of a bird rising with its wings spread. The full form 飛 shows both wings; the simplification kept the motion.",words:[["飞机","fēijī","aeroplane"],["飞快","fēikuài","at great speed"]],sent:["飞机很快。","Fēijī hěn kuài.","Planes are fast."]},
{c:"票",p:"piào",m:"ticket",comp:[],pos:["n"],story:"Fire over an altar in the oldest form — sparks going up. Light, floating things; and then the slip of paper that stands in for money.",o:"Originally fire and sparks rising, hence light and to float. Borrowed for the paper slip: a ticket, a banknote, a vote.",words:[["车票","chēpiào","travel ticket"],["电影票","diànyǐngpiào","cinema ticket"],["买票","mǎi piào","to buy a ticket"]],sent:["我要两张车票。","Wǒ yào liǎng zhāng chēpiào.","I want two tickets."]},
{c:"兴",p:"xìng",m:"interest; (xīng) to thrive",comp:["小","八"],pos:["n","v"],story:"Four hands lifting something between them in the full form 興 — a thing raised up. Read xīng it is prospering; read xìng it is the lift you feel in 高兴.",o:"Hands at all four corners of an object, raising it together. To rise and flourish; and in the fourth tone, elevated spirits.",words:[["高兴","gāoxìng","happy, pleased"],["兴趣","xìngqù","interest"],["高兴地","gāoxìng de","happily"]],sent:["我很高兴。","Wǒ hěn gāoxìng.","I'm very happy."]}
);

const META = {};
Object.assign(META, {
"一":{pos:["num"],o:"One stroke for one thing. The oracle-bone form 3,000 years ago is identical to the one you write today — it has never needed to change."},
"二":{pos:["num"],o:"Two strokes for two. The lower line is drawn longer so 二 can't be mistaken for a badly-spaced 一."},
"三":{pos:["num"],o:"Three strokes. The counting system stops being literal at four — 四 breaks the pattern, because four scratches in a row became unreadable."},
"十":{pos:["num"],o:"Originally a single vertical stroke meaning 'ten'. A dot was added mid-shaft to distinguish it, and over time the dot stretched into the horizontal bar."},
"人":{pos:["n"],o:"A side view of a standing person — head and arm at the top, two legs below. Squeezed against a left edge it becomes 亻, which you'll meet in dozens of characters."},
"大":{pos:["adj"],o:"A person (人) seen from the front with arms outstretched. 'Big' is shown by a human gesture rather than by a big thing."},
"小":{pos:["adj"],o:"Three small marks — grains of sand, or specks. The middle stroke grew a hook as brush writing took over."},
"上":{pos:["loc","v"],o:"An indicator character: a short mark placed above a baseline to point at 'above'. Meaning is shown by position, not by a picture."},
"下":{pos:["loc","v"],o:"The exact mirror of 上 — the mark hangs below the line. The pair is the clearest example of Chinese writing meaning through position."},
"中":{pos:["loc","n"],o:"A banner or arrow through the centre of a frame. China calls itself 中国, the Middle Kingdom, using this same character."},
"日":{pos:["n"],o:"A circle with a dot at the centre — the sun. Brush writing squared off the circle; the dot flattened into the middle stroke."},
"月":{pos:["n"],o:"A crescent moon, drawn curved because the moon is rarely full. Careful: the 月 inside 有, 朋 and 能 is actually 肉 (flesh), a different component that collapsed into the same shape."},
"山":{pos:["n"],o:"Three peaks rising from a baseline. One of the purest surviving pictographs — the oracle-bone version is recognisably the same drawing."},
"水":{pos:["n"],o:"A central current with droplets flying off either side. On the left of a character it compresses to 氵, the three-drop water radical."},
"火":{pos:["n"],o:"Flames rising to a point with sparks at the sides. Underneath a character it flattens into the four dots 灬 — those dots in 点 and 热 are fire."},
"木":{pos:["n"],o:"A tree: trunk, branches above, roots below. Doubled it means a wood (林), tripled a forest (森) — one of the few places Chinese stacks meaning literally."},
"口":{pos:["n"],o:"An open mouth, drawn as a simple square. As a radical it marks eating, speaking, shouting and — surprisingly often — sound-borrowed characters like 吗."},
"目":{pos:["n"],o:"An eye, originally drawn horizontally with a pupil inside. It was rotated upright to fit the tall, narrow proportions Chinese characters settled into."},
"手":{pos:["n"],o:"A hand with fingers and wrist. On the left it flattens into 扌, the hand radical found in most verbs about doing things with your hands."},
"心":{pos:["n"],o:"A drawing of an actual heart — chambers and aorta. Chinese located thought in the heart, not the head, which is why 想 (think) and 爱 (love) are built on it. Underneath a character it becomes 忄."},
"女":{pos:["n"],o:"A figure kneeling with hands folded in the lap — the formal seated posture of a woman in early Zhou society. It heads one of the largest character families."},
"子":{pos:["n"],o:"A swaddled infant: large head, arms free, legs wrapped together. It later became a respectful suffix for philosophers — 孔子, Confucius."},
"好":{pos:["adj"],o:"A woman (女) beside a child (子). The traditional reading is that a mother with her child is the picture of good fortune; some scholars argue it originally meant 'to love'."},
"我":{pos:["pron"],o:"A hand gripping a serrated halberd. It was borrowed purely for its sound to write the first-person pronoun — the weapon meaning fell away entirely."},
"你":{pos:["pron"],o:"The person radical 亻 plus 尔 for sound. A relatively late character; earlier Chinese used 汝 and 尔 for 'you'."},
"他":{pos:["pron"],o:"Person (亻) plus 也. Originally meant 'other' in general; the gendered split into 他/她 was invented in the 1920s under Western influence."},
"她":{pos:["pron"],o:"Coined around 1918 by the writer Liu Bannong, who swapped 他's person radical for 女 so Chinese could translate 'she'. One of the newest characters in common use."},
"们":{pos:["part"],o:"Person (亻) plus gate (门) for sound. A plural suffix that only attaches to people — you cannot say 书们 for books."},
"马":{pos:["n"],o:"A horse in profile: mane, body, legs, tail. The simplified 马 compresses the four legs of traditional 馬 into one sweeping hook."},
"吗":{pos:["part"],o:"Mouth (口) for meaning plus horse (马) for sound — a textbook phonetic compound. The mouth says 'this is spoken'; the horse says 'it sounds like ma'."},
"不":{pos:["adv"],o:"Probably a flower calyx originally, borrowed for its sound to write 'not'. The 'bird hitting a ceiling' story is a later teaching aid, not the real history."},
"是":{pos:["v"],o:"Sun (日) above 正 (straight, correct) — 'aligned with the sun' meant right or true. It only became the verb 'to be' in later Chinese."},
"的":{pos:["part"],o:"White (白) plus 勺 for sound. Originally meant 'bright' or 'target' — still read dì in 目的. Borrowed as a grammatical particle, it is now the most frequent character in written Chinese."},
"了":{pos:["part"],o:"A child with its arms bound. Borrowed for sound to mark completed action — 吃了 means the eating is finished."},
"有":{pos:["v"],o:"A hand reaching over a piece of meat (the 月 here is 肉, flesh, not the moon). To have is to have food in hand."},
"在":{pos:["v","cov"],o:"Earth (土) with a sprout pushing through. What is rooted in the soil is present — hence 'to be at' a place."},
"这":{pos:["pron"],o:"The walking radical 辶 plus 文. A late character; classical Chinese used 此 for 'this'."},
"那":{pos:["pron"],o:"Originally a place name borrowed for sound. Pairs with 这 the way 'that' pairs with 'this'."},
"个":{pos:["mw"],o:"Half of 竹 (bamboo) — a single bamboo stalk, counted one by one. It became the default measure word, usable when you don't know the specific one."},
"什":{pos:["pron"],o:"Person (亻) plus ten (十) — originally a squad of ten soldiers. Borrowed for sound; it now survives almost solely inside 什么."},
"么":{pos:["part"],o:"A simplification of 麼, itself a phonetic. It forms the tail of the question words: 什么, 怎么, 那么."},
"谁":{pos:["pron"],o:"Speech (讠) plus 隹, a short-tailed bird, for sound. Asking with words. Read shéi in speech but shuí in formal reading."},
"很":{pos:["adv"],o:"Originally meant 'to disobey'. In modern Chinese it is grammatical filler more than emphasis: 我很好 is simply 'I'm fine', not 'I'm very fine'."},
"也":{pos:["adv"],o:"Disputed — possibly a basin, possibly a snake. In classical Chinese it was a sentence-final particle; the modern meaning 'also' is unrelated to its origin."},
"和":{pos:["conj"],o:"Grain (禾) beside a mouth (口) — sharing food, hence harmony. As a conjunction it joins nouns only; it cannot link two sentences the way English 'and' does."},
"都":{pos:["adv"],o:"Originally 'capital city' (read dū, as in 首都). Borrowed for the meaning 'all'. It sits before the verb: 我们都是 — 'we all are'."},
"天":{pos:["n"],o:"A big person (大) with a line marking the crown of the head. It first meant the top of the skull, then the sky above, then heaven."},
"地":{pos:["n"],o:"Earth (土) plus 也 for sound. The counterpart of 天 — together 天地 means the whole world."},
"年":{pos:["n"],o:"A person carrying ripe grain on their back. One harvest was one year, so the character for the crop became the character for the cycle."},
"今":{pos:["n"],o:"A cover or roof over a mark — the moment held under the present. Pairs with 昔 (the past) in classical texts."},
"时":{pos:["n"],o:"Sun (日) plus 寺 for sound. Traditional 時 shows the sun measured against a standard — telling the time by shadow."},
"候":{pos:["n","v"],o:"Person (亻) plus a shape meaning to watch or await. It survives mainly inside 时候, 'the time when'."},
"现":{pos:["n","v"],o:"Jade (王, originally 玉) plus see (见) — jade brought out where it can be seen. Hence 'to appear', and then 'the present moment'."},
"去":{pos:["v"],o:"Probably a person leaving a pit or doorway. Motion away from the speaker, the opposite of 来."},
"来":{pos:["v"],o:"A wheat plant with drooping ears. Wheat was a crop that 'came' to China from the west, and the character was borrowed for 'to come'."},
"回":{pos:["v"],o:"A spiral drawn as a square within a square — water eddying, turning back on itself. Hence returning."},
"看":{pos:["v"],o:"A hand (手) above an eye (目) — shading your brow to see into the distance. One of the most transparent compounds in the language."},
"说":{pos:["v"],o:"Speech (讠) plus 兑 for sound. The 讠 radical is a compressed 言, itself a mouth with sound-lines rising out of it."},
"听":{pos:["v"],o:"Simplified from 聽, which contained 耳 (ear). The modern form swapped in 口 and 斤 — so the ear, oddly, disappeared from the character for listening."},
"读":{pos:["v"],o:"Speech (讠) plus 卖 for sound. Reading meant reading aloud for most of history, which is why the speech radical and not the eye."},
"写":{pos:["v"],o:"Simplified from 寫 — a roof over 舄. It first meant to place something under cover, then to transfer marks onto a surface."},
"吃":{pos:["v"],o:"Mouth (口) plus 乞 (to beg) for sound. Earlier Chinese used 食 for eating; 吃 originally meant to stammer."},
"喝":{pos:["v"],o:"Mouth (口) plus 曷 for sound. Read hè it means to shout — same character, different tone, different meaning."},
"做":{pos:["v"],o:"Person (亻) plus 故. A late, colloquial character that split off from 作 — 做 took the everyday actions, 作 kept the formal compounds."},
"走":{pos:["v"],o:"A swinging upper body above a foot (止). In classical Chinese it meant 'to run'; modern Chinese demoted it to 'walk'."},
"坐":{pos:["v"],o:"Two people (人人) facing each other on the ground (土). It also covers riding in a vehicle — you sit in a bus, so 坐车."},
"想":{pos:["v"],o:"Heart (心) beneath 相 (to examine). Looking with the heart — which in Chinese covers thinking, wanting and missing someone."},
"要":{pos:["v","aux"],o:"Originally a picture of a woman's waist, seen from behind with hands on hips — the ancestor of 腰. Borrowed for 'to want' and 'must'."},
"会":{pos:["aux","v","n"],o:"Simplified from 會 — a lid fitting a vessel, meaning to come together. Hence a meeting, and the learned skill you 'come together' with."},
"能":{pos:["aux"],o:"Originally a picture of a bear. Bears meant raw power, and the character drifted from the animal to the ability — the bear meaning moved to 熊."},
"知":{pos:["v"],o:"Arrow (矢) plus mouth (口) — words that fly straight to the mark. To know is to speak with the accuracy of an arrow."},
"道":{pos:["n","v"],o:"The walking radical 辶 with a head (首) — a person heading along a path. It became the philosophical 'the Way' of Daoism."},
"学":{pos:["v"],o:"Simplified from 學: two hands guiding a child (子) under a roof, with 爻 above representing what is being taught."},
"生":{pos:["v","n","adj"],o:"A sprout breaking through the ground line. Birth, growth, life — and 'raw', because uncooked food is food still in its living state."},
"家":{pos:["n"],o:"A pig (豕) under a roof. In the Neolithic a household was defined by its livestock, so the pig in the house came to mean the family."},
"国":{pos:["n"],o:"Simplified from 國: a boundary (囗) around a weapon guarding territory. The modern form puts jade (玉) inside the walls — treasure within borders."}
});

Object.assign(META, {
"多":{pos:["adj"],o:"Two 夕 (evening) stacked — one night after another accumulating. Quantity shown as time piling up."},
"少":{pos:["adj"],o:"小 (small) with one more mark falling away. Read shào it means young, as in 少年."},
"几":{pos:["pron","num"],o:"A low table, drawn from the side. Borrowed for the question 'how many' — used for numbers under about ten; above that, 多少."},
"半":{pos:["num"],o:"An ox (牛) being divided by the splitting marks 八. Halving an animal was the everyday image of dividing something in two."},
"两":{pos:["num"],o:"A pair of matched objects inside one frame — originally a unit of weight, the tael. Chinese uses 两 before measure words and 二 for counting."},
"百":{pos:["num"],o:"One (一) above 白 for sound. The line on top marks it as a complete unit of counting."},
"千":{pos:["num"],o:"A person (人) with a horizontal stroke through them, marking a thousand. Related in form to 十 — the stroke count encodes the scale."},
"万":{pos:["num"],o:"Simplified from 萬, a picture of a scorpion, borrowed purely for sound. Chinese counts in units of ten thousand, so a million is 一百万 — a hundred 万."},
"块":{pos:["mw","n"],o:"Earth (土) plus 夬 for sound — a clod of soil, hence any lump or piece. In speech it is the everyday word for yuan."},
"钱":{pos:["n"],o:"Metal (钅) plus 戋 for sound. It first named a farming spade whose shape was used for early bronze coinage — the tool became the money."},
"买":{pos:["v"],o:"Simplified from 買: a net (罒) over a cowrie shell (贝). Cowries were China's earliest currency, so the shell marks almost every character about money."},
"卖":{pos:["v"],o:"Simplified from 賣 — 買 (buy) with an element added on top, marking the outgoing direction. Buy is mǎi, sell is mài: third tone in, fourth tone out."},
"东":{pos:["loc","n"],o:"Simplified from 東, usually explained as the sun (日) seen through a tree (木) at dawn. Paired with 西 it makes 东西, the everyday word for 'thing'."},
"西":{pos:["loc","n"],o:"A bird settling into its nest — birds roost as the sun goes west. Borrowed for the direction."},
"南":{pos:["loc","n"],o:"Probably a hanging bell or wind chime, borrowed for sound. Chinese names the directions in the order 东南西北."},
"北":{pos:["loc","n"],o:"Two people standing back to back — the original meaning was 'to turn one's back', which survives in 败北, to be defeated. North is the direction you turn your back on."},
"里":{pos:["loc"],o:"A field (田) over earth (土) — the land of a village, hence the inside of a settlement. It also names a traditional unit of distance, about half a kilometre."},
"外":{pos:["loc"],o:"Evening (夕) plus divination (卜). Omens were properly read at dawn; reading them at night was irregular, outside the norm."},
"前":{pos:["loc"],o:"A foot in a boat — moving forward. It covers both space and time: 前面 is ahead of you, 以前 is before now."},
"后":{pos:["loc"],o:"Simplified from 後 for 'behind'. The character 后 originally meant a sovereign, and still does in 皇后, empress — two unrelated words now sharing one form."},
"左":{pos:["loc"],o:"A hand above 工 (a tool). 左 and 右 both begin with the same hand shape; only what sits beneath tells them apart."},
"右":{pos:["loc"],o:"A hand above a mouth (口) — the hand you eat with. That mouth is the one reliable way to tell 右 from 左."},
"边":{pos:["loc","n"],o:"Simplified from 邊. The walking radical 辶 marks an edge you travel along. It suffixes directions: 左边, 右边, 外边."},
"面":{pos:["n"],o:"A face with an eye (目) framed inside it. In simplified Chinese it absorbed 麵 (flour), so one character now covers face, side and noodles."},
"开":{pos:["v"],o:"Simplified from 開: two hands lifting the bar from a gate (门). Opening a door, a shop, a light or a car all use it."},
"关":{pos:["v","n"],o:"Simplified from 關 — a gate with its crossbar in place. From 'to shut' come 关系 (connection) and 海关 (customs), all about what a barrier controls."},
"门":{pos:["n"],o:"Simplified from 門, a pair of swinging doors seen head on. It appears as both meaning and sound inside 问, 们 and 间."},
"车":{pos:["n"],o:"A chariot seen from above: the axle running across, wheels on either side. Simplified 车 keeps the axle and drops one wheel."},
"路":{pos:["n"],o:"Foot (足) plus 各 for sound. Where the feet go. The 足 radical marks most characters about walking, kicking and stumbling."},
"站":{pos:["v","n"],o:"立 (to stand) plus 占 for sound. A station is where vehicles stand still — a modern extension of a very old character."},
"到":{pos:["v"],o:"An arrow reaching the ground plus 刀 for sound. Attached to a verb it marks success: 看到 means you actually saw it."},
"从":{pos:["cov"],o:"Two people (人人) walking in file, one following the other. Simplified 从 restores the original oracle-bone form, which traditional 從 had buried."},
"给":{pos:["v","cov"],o:"Silk (纟) plus 合 for sound. It first meant to supply or provide; the everyday sense 'to give' came later."},
"对":{pos:["adj","cov"],o:"Simplified from 對. Two senses worth separating: 对 alone means correct, while 对我说 means to say something facing me."},
"请":{pos:["v"],o:"Speech (讠) plus 青 for sound. 青 powers a whole phonetic family — 请 qǐng, 清 qīng, 情 qíng, 晴 qíng, 精 jīng — same sound, different radicals."},
"爸":{pos:["n"],o:"Father (父) on top for meaning, 巴 below for sound. 父 itself shows a hand holding a stone axe — the one who wields the tool."},
"妈":{pos:["n"],o:"Woman (女) for meaning, horse (马) for sound. Around 80% of Chinese characters are built this way: one half tells you roughly what, the other roughly how it sounds."},
"哥":{pos:["n"],o:"Two 可 stacked. It entered Chinese from a Central Asian language during the Tang dynasty, replacing the native 兄 in everyday speech."},
"姐":{pos:["n"],o:"Woman (女) plus 且 for sound. Chinese never just says 'sister' — 姐姐 and 妹妹 are different words, and you must know who is older."},
"弟":{pos:["n"],o:"A cord wound in order around a stake. The idea of sequence gave both 'younger brother' and 第, the ordinal prefix in 第一."},
"妹":{pos:["n"],o:"Woman (女) plus 未 (not yet) — the one not yet grown. 未 supplies both sound and a hint of meaning."},
"朋":{pos:["n"],o:"Two strings of cowrie shells hung side by side — an ancient unit of currency. Things paired became the image of companionship."},
"友":{pos:["n"],o:"Two hands (又) reaching in the same direction — a clasp. Drawn more than 3,000 years ago and still legible as exactly that."},
"老":{pos:["adj"],o:"A long-haired figure bent over a stick. It carries respect rather than insult, which is why a teacher is 老师 and a boss 老板."},
"师":{pos:["n"],o:"Originally an army division, then one who leads and instructs. It suffixes skilled professions: 老师, 律师, 工程师."},
"同":{pos:["adj","adv"],o:"A cover over a mouth (口) — voices speaking as one. Hence sameness, and 同学, one who studies alongside you."},
"名":{pos:["n"],o:"Evening (夕) plus mouth (口). In the dark you cannot be recognised by sight, so you call out your name."},
"字":{pos:["n"],o:"A child (子) under a roof. It first meant to bear children, then to name them, then the written name itself — and finally any character. 汉字 means Han characters."},
"叫":{pos:["v"],o:"Mouth (口) plus 丩 for sound. It covers both shouting and being named: 我叫… is literally 'I am called…'."},
"住":{pos:["v"],o:"Person (亻) plus 主 (master) for sound. Attached to a verb it means to hold fast: 记住 is to fix something in memory."},
"工":{pos:["n"],o:"A carpenter's square or chisel, drawn from the side. It supplies the sound in 左, 红 and 空."},
"作":{pos:["v"],o:"Person (亻) plus 乍. It split from 做 over time: 作 kept the formal compounds like 工作 and 作业, 做 took the everyday verb."},
"事":{pos:["n"],o:"A hand holding an official banner — court business. Where 东西 is a physical thing, 事 is a thing that happens."},
"问":{pos:["v"],o:"A mouth (口) inside a gate (门) — calling through the door. The gate is also the sound, making this both a meaning and a phonetic compound."},
"题":{pos:["n"],o:"是 for sound plus 页 (head). It first meant a forehead, then the heading of a text, then the topic itself. 问题 means both question and problem."},
"明":{pos:["adj","n"],o:"Sun (日) and moon (月) side by side — the two sources of light in one character. It means bright, clear, and 'next' in 明天."},
"白":{pos:["adj","adv"],o:"Probably the sun with a ray rising from it — the first light of dawn. It also means 'in vain': 白说了, said for nothing."},
"早":{pos:["adj","n"],o:"The sun (日) just above the horizon line. On its own it is a casual 'morning!' between friends."},
"晚":{pos:["adj","n"],o:"Sun (日) plus 免 for sound. It covers both the evening and simple lateness."},
"午":{pos:["n"],o:"A pestle, borrowed for sound; it also names the seventh earthly branch in the old zodiac calendar. It splits the day: 上午, 中午, 下午."},
"星":{pos:["n"],o:"Sun (日) above 生 (to be born) — lights being born in the night sky. The 日 here stands for any heavenly body, not the sun specifically."},
"期":{pos:["n"],o:"Moon (月) plus 其 for sound. Periods of time were counted in moons. Weekdays are numbered: 星期一 through 星期六, with Sunday as 星期天."},
"分":{pos:["v","n","mw"],o:"A knife (刀) below the splitting marks 八 — cutting something apart. A minute is a divided hour; read fèn it means a portion or duty."},
"点":{pos:["n","v","mw"],o:"Simplified from 點: black (黑) plus 占. The four dots at the base are the fire radical 灬. It covers a dot, an o'clock, a little, and ordering food."},
"钟":{pos:["n"],o:"Metal (钅) plus 中 for sound — a bronze bell. Bells marked the hours long before clocks, so the instrument named the time."},
"爱":{pos:["v"],o:"Traditional 愛 carried 心 (heart) at its centre; simplification replaced it with 友 (friend). Whether removing the heart from love was a loss is a debate Chinese typographers still enjoy."},
"喜":{pos:["v","adj"],o:"A drum above a mouth (口) — music and singing. Doubled as 囍, the double-happiness glyph pasted up at weddings."},
"欢":{pos:["adj"],o:"Simplified from 歡. 欠 on the right shows a person with mouth open — it marks characters about breath and exclamation, like 歌 and 吹."},
"得":{pos:["part","v","aux"],o:"A hand taking a cowrie shell on the road — obtaining. It now does three jobs by tone: de links a verb to its description, dé means to obtain, děi means must."},
"太":{pos:["adv"],o:"大 (big) with an extra mark — bigger than big. It usually pairs with 了: 太贵了, far too expensive."},
"最":{pos:["adv"],o:"Originally 'to seize'. It became the superlative marker: put 最 before any adjective and you get the -est form."},
"真":{pos:["adj","adv"],o:"An eye (目) at the centre of the character. In Daoist texts it meant genuine or authentic — what you verify with your own eyes."},
"还":{pos:["adv"],o:"Simplified from 還. The walking radical 辶 means going back round. Read hái it means 'still'; read huán it means to give something back."},
"就":{pos:["adv"],o:"A tall building plus 尤 — to go toward and settle at. Its modern uses all share a sense of immediacy: 我就来, I'm coming right now."},
"新":{pos:["adj"],o:"A tree (木) and an axe (斤) — freshly cut timber. The original meaning survives in 薪, firewood."}
});


/* Sharper grammar labels than the broad codes above. */
Object.assign(META, {
  "吗": { pos: ["part-q"],   o: META["吗"].o },
  "了": { pos: ["part-asp"], o: META["了"].o },
  "的": { pos: ["part-str"], o: META["的"].o },
  "得": { pos: ["part-str"], o: META["得"].o },
  "们": { pos: ["part-pl"],  o: META["们"].o },
  "么": { pos: ["part-q"],   o: META["么"].o }
});

/* Fold etymology and grammar tags onto the characters. */
HQ.forEach(ch => {
  const m = META[ch.c];
  if (m) { ch.o = ch.o || m.o; ch.pos = ch.pos || m.pos; }
  if (!ch.pos) ch.pos = ["n"];
});

const POS_LABEL = {
  num: "number", n: "noun", v: "verb", adj: "adjective", pron: "pronoun",
  adv: "adverb", conj: "connective", mw: "measure word", loc: "position word",
  cov: "preposition", aux: "modal verb",
  "part-q": "question word", "part-asp": "aspect particle",
  "part-str": "linking particle", "part-pl": "plural marker", part: "particle"
};

const STAGES = [
  {n:1, icon:"🌱", name:"Seed",     zh:"种子", end:20,  core:true,  blurb:"Pictographs and building blocks."},
  {n:2, icon:"🌿", name:"Sprout",   zh:"发芽", end:46,  core:true,  blurb:"Pronouns, to-be, negation, questions."},
  {n:3, icon:"🍃", name:"Branch",   zh:"枝叶", end:76,  core:true,  blurb:"Everyday verbs and time words."},
  {n:4, icon:"🥉", name:"Explorer", zh:"探索", end:111, core:true,  blurb:"Numbers, money, directions, shops."},
  {n:5, icon:"🥈", name:"Everyday", zh:"日常", end:151, core:true,  blurb:"People, time, feelings."},
  {n:6, icon:"🍜", name:"Kitchen",  zh:"厨房", end:178, core:false, blurb:"Food, drink and everything on a menu."},
  {n:7, icon:"📖", name:"Reader",   zh:"阅读", end:241, core:true,  blurb:"Numbers, connectives and the grammar that joins characters into sentences."},
  {n:8, icon:"🏙️", name:"The World", zh:"世界", end:302, core:true,  blurb:"The body, colours, weather, buildings — the physical world you read about."},
  {n:9, icon:"💬", name:"Connect",  zh:"交流", end:348, core:true,  blurb:"Language, study, screens, and the words for thinking and remembering."}
];

/* ============================================================
   Tiers — the gates on the library

   The nine stages are a teaching order; these are three doors across it. The
   Library used to lay all of the characters out at once, which made a beginner
   scroll past hundreds they had no business opening yet — and let them open
   one anyway, out of order, without any of the parts it is built from.

   The splits are the conventional literacy milestones: 200 gets you signs,
   prices and the shape of a sentence; 500 gets you most everyday writing; 1000
   covers roughly nine characters in ten on an ordinary page. A tier opens when
   you know TIER_UNLOCK of the one before it, so the road ahead stays visible
   without being walkable.
   ============================================================ */

const TIERS = [
  {n:1, icon:"🏮", name:"Foundation",  zh:"基础", to:200,
   blurb:"The characters everything else is built from. Signs, prices, menus, and the shape of a sentence."},
  {n:2, icon:"📚", name:"Independent", zh:"自读", to:500,
   blurb:"Messages, product labels, social posts — reading without a dictionary at your elbow."},
  {n:3, icon:"🎓", name:"Fluent",      zh:"流利", to:1000,
   blurb:"News snippets and articles. Around nine characters in ten on an ordinary page."}
];

/* Share of a tier you need before the next one opens. High enough that you
   can't skim the foundation and jump, low enough that a handful of stubborn
   characters can't hold the whole door shut. */
const TIER_UNLOCK = 0.8;

HQ.forEach((ch, i) => {
  ch.i = i;
  ch.stage = STAGES.find(s => i < s.end).n;
});

const CHAR_INDEX = {};
HQ.forEach(ch => { CHAR_INDEX[ch.c] = ch; });

/* Component families — derived, so adding characters extends the trees for free. */
const FAMILIES = {};
HQ.forEach(ch => {
  ch.comp.forEach(k => {
    if (!FAMILIES[k]) FAMILIES[k] = [];
    FAMILIES[k].push(ch.c);
  });
});

/* ============================================================
   Radicals — the ~200 semantic parts that organise the whole
   writing system. Keyed by the base form used in `comp`.
   ============================================================ */

const RADICALS = {
  "口": {form:"口", variants:"", name:"mouth", pin:"kǒu", strokes:3,
    does:"Marks eating, drinking, speaking and shouting — and a great many characters where it simply says 'this is a spoken word', like 吗 and 吧."},
  "人": {form:"亻", variants:"人 亻", name:"person", pin:"rén", strokes:2,
    does:"On the left edge it squeezes to 亻. It marks people, roles and things people do to each other."},
  "水": {form:"氵", variants:"水 氵", name:"water", pin:"shuǐ", strokes:3,
    does:"Three drops on the left. Every liquid, every river, and every action involving washing or pouring."},
  "心": {form:"忄", variants:"心 忄", name:"heart", pin:"xīn", strokes:4,
    does:"Chinese put thought and feeling in the heart, not the head — so this radical marks emotions and mental states alike."},
  "手": {form:"扌", variants:"手 扌", name:"hand", pin:"shǒu", strokes:3,
    does:"Flattened to 扌 on the left. It marks verbs done with the hands: pushing, pulling, carrying, striking."},
  "木": {form:"木", variants:"", name:"tree, wood", pin:"mù", strokes:4,
    does:"Trees, timber, and anything made of it. Doubled it is a wood, tripled a forest."},
  "日": {form:"日", variants:"", name:"sun, day", pin:"rì", strokes:4,
    does:"The sun, times of day, brightness and the calendar."},
  "月": {form:"月", variants:"月 ⺼", name:"moon / flesh", pin:"yuè", strokes:4,
    does:"Two radicals that collapsed into one shape. In 明 and 期 it is the moon; in 有, 能 and 服 it is 肉, flesh — which is why body-part characters look lunar."},
  "火": {form:"火", variants:"火 灬", name:"fire", pin:"huǒ", strokes:4,
    does:"On the left it stays 火; underneath it becomes four dots 灬. Cooking, heat, burning — the dots in 点 and 热 are flames."},
  "女": {form:"女", variants:"", name:"woman", pin:"nǚ", strokes:3,
    does:"Family relationships, and a large group of characters where it carries meaning while the other half carries sound."},
  "讠": {form:"讠", variants:"言 讠", name:"speech", pin:"yán", strokes:2,
    does:"A compressed 言 — a mouth with sound rising from it. Anything said, asked, read aloud or written down."},
  "辶": {form:"辶", variants:"", name:"walking", pin:"chuò", strokes:3,
    does:"A foot on a road, wrapping around the bottom-left. Movement, travel, and roads themselves."},
  "钅": {form:"钅", variants:"金 钅", name:"metal", pin:"jīn", strokes:5,
    does:"Metals, tools, coins and bells. It is why 钱 (money) and 钟 (clock) look related — both were cast in bronze."},
  "纟": {form:"纟", variants:"糸 纟", name:"silk", pin:"sī", strokes:3,
    does:"Thread, cloth, and by extension binding, connecting and organising."},
  "食": {form:"饣", variants:"食 饣", name:"food", pin:"shí", strokes:3,
    does:"A covered vessel of grain. It heads nearly every character about meals, feeding and hospitality."},
  "门": {form:"门", variants:"門 门", name:"gate", pin:"mén", strokes:3,
    does:"A doorway. It carries meaning in 问 and 间, and sound in 们."},
  "土": {form:"土", variants:"", name:"earth", pin:"tǔ", strokes:3,
    does:"Soil, ground, places and buildings raised from it."},
  "目": {form:"目", variants:"", name:"eye", pin:"mù", strokes:5,
    does:"Seeing, looking and attention — and by extension truth, as in 真."},
  "贝": {form:"贝", variants:"貝 贝", name:"cowrie shell", pin:"bèi", strokes:4,
    does:"Cowrie shells were China's first currency. This radical marks money, trade, value and debt."},
  "刀": {form:"刂", variants:"刀 刂", name:"knife", pin:"dāo", strokes:2,
    does:"On the right edge it becomes 刂. Cutting, dividing, and sharpness of any kind."},
  "又": {form:"又", variants:"", name:"right hand", pin:"yòu", strokes:2,
    does:"A hand, drawn with three fingers. It is the grasping hand inside 友, 取 and 受."},
  "石": {form:"石", variants:"", name:"stone", pin:"shí", strokes:5,
    does:"Rock, minerals, and things made from fired earth or stone."},
  "虫": {form:"虫", variants:"", name:"creeping creature", pin:"chóng", strokes:6,
    does:"Originally a snake. It covers insects, reptiles, and anything that hatches or crawls."},
  "鸟": {form:"鸟", variants:"鳥 鸟", name:"bird", pin:"niǎo", strokes:5,
    does:"Long-tailed birds. Its cousin 隹 covers short-tailed ones — both appear in 鸡 across different eras."},
  "力": {form:"力", variants:"", name:"strength", pin:"lì", strokes:2,
    does:"A plough, or a flexed arm. Effort, power and labour."},
  "立": {form:"立", variants:"", name:"to stand", pin:"lì", strokes:5,
    does:"A person standing on the ground line. Standing, establishing, setting up."},
  "足": {form:"足", variants:"足 ⻊", name:"foot", pin:"zú", strokes:7,
    does:"Feet and what they do — walking, running, kicking, stumbling, and the roads they travel."},
  "衣": {form:"衤", variants:"衣 衤", name:"clothing", pin:"yī", strokes:5,
    does:"Garments and cloth. On the left it loses a stroke and becomes 衤 — easily confused with 礻, the altar radical."},
  "田": {form:"田", variants:"", name:"field", pin:"tián", strokes:5,
    does:"A ploughed field seen from above, divided into plots. It marks farmland, and by extension boundaries and measures."},
  "王": {form:"王", variants:"玉 王", name:"jade", pin:"yù", strokes:4,
    does:"Usually jade rather than king — three discs on a thread. It marks precious stones and, by extension, things brought out to be admired."}
};

/* ============================================================
   Quests — a tangible thing you'll be able to do, and the exact
   characters standing between you and doing it.
   ============================================================ */

/* ============================================================
   The side quest — a real restaurant menu. Every glyph on it is a
   character in this library, so anything you hover is explainable
   and anything you don't know yet is learnable.
   ============================================================ */

const MENU = {
  title: "菜单",
  name: "山水饭馆",
  en: "Shanshui Restaurant · est. 1987",
  sections: [
    { head: "面", en: "Noodles", items: [
      ["牛肉面",   "niúròu miàn",     "beef noodles",            28, ["大碗，牛肉很多","dà wǎn, niúròu hěn duō","big bowl, plenty of beef"]],
      ["羊肉面",   "yángròu miàn",    "lamb noodles",            30, ["很香，不太辣","hěn xiāng, bú tài là","fragrant, not too spicy"]],
      ["鸡蛋面",   "jīdàn miàn",      "egg noodles",             22, ["两个鸡蛋","liǎng gè jīdàn","two eggs"]],
      ["酸辣汤面", "suānlà tāngmiàn", "hot & sour noodle soup",  24, ["很酸很辣","hěn suān hěn là","properly sour and spicy"]],
      ["炒面",     "chǎomiàn",        "fried noodles",           20, ["要不要鸡蛋？","yào bú yào jīdàn?","with egg?"]]
    ]},
    { head: "饭", en: "Rice", items: [
      ["蛋炒饭",   "dàn chǎofàn",     "egg fried rice",          18, ["很好吃，一点也不辣","hěn hǎochī, yìdiǎn yě bú là","tasty, not spicy at all"]],
      ["猪肉炒饭", "zhūròu chǎofàn",  "pork fried rice",         20, ["猪肉多，米饭香","zhūròu duō, mǐfàn xiāng","lots of pork, fragrant rice"]],
      ["牛肉饭",   "niúròu fàn",      "beef over rice",          26, ["牛肉在米饭上面","niúròu zài mǐfàn shàngmiàn","beef on top of the rice"]],
      ["米饭",     "mǐfàn",           "steamed rice",             3, ["一碗","yì wǎn","one bowl"]]
    ]},
    { head: "菜", en: "Dishes", items: [
      ["辣子鸡",   "làzi jī",         "chilli chicken",          38, ["很辣，请小心","hěn là, qǐng xiǎoxīn","very spicy — careful"]],
      ["酸菜鱼",   "suāncài yú",      "fish with pickled greens",58, ["大鱼，酸菜，很香","dà yú, suāncài, hěn xiāng","big fish, pickled greens, fragrant"]],
      ["香辣牛肉", "xiānglà niúròu",  "fragrant chilli beef",    42, ["很香，也很辣","hěn xiāng, yě hěn là","fragrant, and very spicy"]],
      ["炒菜",     "chǎo cài",        "stir-fried vegetables",   16, ["今天的菜","jīntiān de cài","whatever came in today"]]
    ]},
    { head: "汤", en: "Soup", items: [
      ["酸辣汤",   "suānlà tāng",     "hot & sour soup",         12, ["天天都有","tiāntiān dōu yǒu","every day"]],
      ["鸡蛋汤",   "jīdàn tāng",      "egg drop soup",           10, ["不辣，很好喝","bú là, hěn hǎohē","not spicy, very good"]],
      ["牛肉汤",   "niúròu tāng",     "beef soup",               18, ["牛肉多，汤很香","niúròu duō, tāng hěn xiāng","lots of beef, fragrant broth"]]
    ]},
    { head: "喝的", en: "Drinks", items: [
      ["茶",       "chá",             "tea",                      5, ["好茶","hǎo chá","good tea"]],
      ["白酒",     "báijiǔ",          "clear spirits",            8, ["不要多喝","bú yào duō hē","don\u2019t overdo it"]],
      ["水",       "shuǐ",            "water",                    3, ["不要钱","bú yào qián","free"]]
    ]}
  ],
  /* Unlocks once you can handle it — see MENU_TIERS below. */
  specials: {
    head: "今天的菜", en: "Today's board",
    items: [
      ["酸菜牛肉面", "suāncài niúròu miàn", "beef noodles with pickled greens", 34],
      ["香辣猪肉炒饭", "xiānglà zhūròu chǎofàn", "fragrant chilli pork fried rice", 26],
      ["大碗羊肉汤", "dà wǎn yángròu tāng", "large bowl of lamb soup", 32]
    ],
    note: ["我们的牛肉都是今天买的。", "Wǒmen de niúròu dōu shì jīntiān mǎi de.",
           "All our beef was bought today."]
  },
  phrases: [
    ["请给我菜单。",       "Qǐng gěi wǒ càidān.",        "Could I have the menu?"],
    ["我要一碗牛肉面。",   "Wǒ yào yì wǎn niúròu miàn.", "I'd like a bowl of beef noodles."],
    ["请不要太辣。",       "Qǐng bú yào tài là.",        "Not too spicy, please."],
    ["这个多少钱？",       "Zhège duōshao qián?",        "How much is this?"],
    ["服务员，买单！",     "Fúwùyuán, mǎidān!",          "Waiter, the bill!"]
  ]
};

/* Every distinct character the quest covers, derived from the menu above so
   editing it keeps the quest honest. Characters actually PRINTED on the menu
   come first: learning one should visibly light up a dish, not a phrase you
   can't see. Ordering-phrase characters follow, each tier in teaching order. */
const MENU_CHARS = (() => {
  const printed = new Set(), spoken = new Set();
  const add = (str, set) => [...str].forEach(c => { if (/[\u4e00-\u9fff]/.test(c)) set.add(c); });
  add(MENU.title, printed); add(MENU.name, printed);
  MENU.sections.forEach(s => { add(s.head, printed); s.items.forEach(i => add(i[0], printed)); });
  MENU.phrases.forEach(p => add(p[0], spoken));
  return HQ.filter(ch => printed.has(ch.c) || spoken.has(ch.c))
           .map((ch, n) => ({ c: ch.c, tier: printed.has(ch.c) ? 0 : 1, n }))
           .sort((a, b) => a.tier - b.tier || a.n - b.n)
           .map(x => x.c);
})();

/* The menu grows up as you do: names first, then descriptions, then a
   specials board with longer dish names and a line from the kitchen. */
/* ============================================================
   Interests — what the word of the week is drawn from

   The curriculum order is fixed and it is not going to be about your
   hobbies: you get 一 and 人 and 是 whether or not you care about them,
   because they are what everything else is built on. That is correct and
   also a bit joyless.

   So this runs alongside rather than through it. Pick a few interests and
   the app shows one real word a week from them — often using characters
   well past where you have got to, which is the point. It is a postcard
   from further up the road, not a drill: nothing here is scheduled, graded
   or counted, and no word of the week ever enters your review queue.

   Each word: [hanzi, pinyin, meaning, a line worth knowing about it].
   ============================================================ */

const INTERESTS = {
  food:   { icon: "🍜", name: "Food & cooking", zh: "美食", words: [
    ["火锅","huǒguō","hotpot","Literally fire pot. In Chongqing the broth is half chilli oil, and the pot is often split down the middle so the faint-hearted have somewhere to go."],
    ["小笼包","xiǎolóngbāo","soup dumplings","Little basket bun. The soup gets inside by folding chilled aspic into the filling — it melts as it steams."],
    ["麻辣","málà","numbing-spicy","Two different sensations: 麻 is the buzz of Sichuan pepper, 辣 is chilli heat. Sichuan cooking is built on holding both at once."],
    ["下厨","xiàchú","to cook","To go down to the kitchen. Used of someone who does not usually cook doing it anyway."],
    ["夜市","yèshì","night market","Night market. The 市 is the same one in 超市 supermarket and 城市 city — a place of trade."],
    ["家常菜","jiācháng cài","home cooking","Home-ordinary dishes. The highest praise a Chinese restaurant meal can get is that it tastes like this."],
    ["回锅肉","huíguōròu","twice-cooked pork","Returned-to-the-pot meat. Boiled, sliced, then fried again — the classic test of a Sichuan cook."],
    ["好吃","hǎochī","tasty","Good-eat. The parallel 好看 good-look and 好听 good-listen work exactly the same way."]
  ]},
  travel: { icon: "✈️", name: "Travel", zh: "旅行", words: [
    ["旅行","lǚxíng","to travel","Travel-go. 旅 once meant a company of soldiers on the march."],
    ["高铁","gāotiě","high-speed rail","High iron. China laid more of it in fifteen years than the rest of the world combined."],
    ["长城","chángchéng","the Great Wall","Long wall. Not one wall but many, built and rebuilt over roughly two thousand years."],
    ["护照","hùzhào","passport","Protect-certificate. 照 is the same character as in photograph."],
    ["古镇","gǔzhèn","old town","Ancient town. What the tourist signs point at when the old quarter has survived."],
    ["山水","shānshuǐ","landscape","Mountains-water. Also the name of the entire tradition of Chinese landscape painting."],
    ["迷路","mílù","to get lost","Confused-road. A useful thing to be able to say."],
    ["一路平安","yílù píng'ān","safe journey","May the whole road be peaceful. What you say to someone leaving."]
  ]},
  music:  { icon: "🎵", name: "Music", zh: "音乐", words: [
    ["音乐","yīnyuè","music","Sound-joy. 乐 is read yuè here and lè when it means happy — the same character, because music was what joy was made of."],
    ["唱歌","chànggē","to sing","Sing-song. Chinese often pairs a verb with its own object like this."],
    ["古筝","gǔzhēng","guzheng","An ancient zither, twenty-one strings over movable bridges. Older than the guitar by a couple of thousand years."],
    ["摇滚","yáogǔn","rock music","Shake-roll. A direct calque of rock and roll, and a good one."],
    ["民谣","mínyáo","folk music","People-ballad. The genre most Chinese singer-songwriters come out of."],
    ["节奏","jiézòu","rhythm","Joint-play. 节 is the node on a bamboo stalk — the regular break in something continuous."],
    ["听众","tīngzhòng","audience","Listening-crowd. 众 is three people stacked up: a crowd, drawn as one."],
    ["好听","hǎotīng","lovely to hear","Good-listen. The exact parallel of 好吃 tasty."]
  ]},
  film:   { icon: "🎬", name: "Film & TV", zh: "电影", words: [
    ["电影","diànyǐng","film","Electric shadow. One of the best coinages in the language."],
    ["导演","dǎoyǎn","director","Guide-perform. Also the verb: to direct."],
    ["武侠","wǔxiá","martial chivalry","The genre of wandering swordsmen. 侠 is a person who rights wrongs outside the law."],
    ["字幕","zìmù","subtitles","Character-curtain. Chinese broadcasts are subtitled even in Mandarin, because the dialects differ so much."],
    ["剧情","jùqíng","plot","Drama-circumstance. 情 covers feeling, situation and the facts of a case."],
    ["演员","yǎnyuán","actor","Performing-member. The 员 is the same one in 服务员 waiter."],
    ["票房","piàofáng","box office","Ticket-room. Literally the booth; now the takings."],
    ["看完","kànwán","to finish watching","Watch-complete. 完 after a verb is how Chinese says all the way through."]
  ]},
  sport:  { icon: "⚽", name: "Sport & fitness", zh: "运动", words: [
    ["运动","yùndòng","exercise, sport","Move-motion. Also used for a political movement."],
    ["跑步","pǎobù","running","Run-step. The 步 is a picture of two footprints, one after the other."],
    ["太极","tàijí","tai chi","Supreme ultimate. The slow form is a martial art practised at walking pace."],
    ["乒乓球","pīngpāngqiú","table tennis","Ping-pong ball — the first two characters are the sound of the ball, which is where the English got it too."],
    ["加油","jiāyóu","go on, keep going","Add oil. Shouted at athletes, students and anyone having a bad week."],
    ["比赛","bǐsài","match, competition","Compare-contest. 比 is two people side by side, being measured against each other."],
    ["队友","duìyǒu","teammate","Team-friend. The 友 is the same one in 朋友."],
    ["出汗","chūhàn","to sweat","Out-sweat. What the exercise is for."]
  ]},
  books:  { icon: "📚", name: "Books & writing", zh: "读书", words: [
    ["书法","shūfǎ","calligraphy","Writing-method. Treated as a fine art on the level of painting, and judged on the movement of the brush."],
    ["小说","xiǎoshuō","novel","Small talk. Fiction was once thought the lesser form; the name stuck after it stopped being true."],
    ["诗","shī","poetry","The Tang dynasty produced so much of it that 唐诗 is its own category of thing."],
    ["成语","chéngyǔ","idiom","Set phrase. Almost always four characters, almost always compressing a whole story into them."],
    ["笔画","bǐhuà","stroke","Brush-stroke. Every character has a fixed number and a fixed order, which is why the writing drills insist."],
    ["作家","zuòjiā","writer","Make-expert. The 家 suffix turns a craft into the person who practises it."],
    ["读者","dúzhě","reader","Reading-one. 者 makes a doer out of a verb, like -er in English."],
    ["翻译","fānyì","to translate","Turn-over and interpret. Also the noun: a translator."]
  ]},
  nature: { icon: "🌿", name: "Nature & outdoors", zh: "自然", words: [
    ["自然","zìrán","nature; natural","Self-so. That which is the way it is of its own accord — a Daoist idea before it was a word for the outdoors."],
    ["爬山","páshān","to hike","Climb-mountain. Used for anything from a stroll up a hill to a serious ascent."],
    ["日出","rìchū","sunrise","Sun-out. 日落 sunset is sun-fall."],
    ["樱花","yīnghuā","cherry blossom","Cherry flower. 花 is both the flower and the verb to spend — money, and time."],
    ["竹子","zhúzi","bamboo","The 竹 radical sits on top of dozens of characters, 笔 pen among them."],
    ["下雪","xiàxuě","to snow","Down-snow. Weather in Chinese falls: 下雨 rain, 下雪 snow."],
    ["星空","xīngkōng","starry sky","Star-emptiness. 空 is both empty and sky, which is a reasonable thing to notice."],
    ["空气","kōngqì","air","Empty-vapour. 气 is one of the oldest ideas in the language: breath, steam, energy, mood."]
  ]},
  tech:   { icon: "💻", name: "Technology", zh: "科技", words: [
    ["电脑","diànnǎo","computer","Electric brain. The Taiwanese coinage that beat the mainland's 计算机 calculating machine in ordinary speech."],
    ["手机","shǒujī","mobile phone","Hand machine. 机 was originally a loom."],
    ["上网","shàngwǎng","to go online","Up-net. 网 is a picture of a net, and needed no new character for the internet."],
    ["软件","ruǎnjiàn","software","Soft-piece. 硬件 hardware is hard-piece."],
    ["密码","mìmǎ","password","Secret code. Also the PIN for your card."],
    ["人工智能","réngōng zhìnéng","artificial intelligence","Human-made wisdom-ability. Usually shortened to 人工智能 in full or AI in speech."],
    ["搜索","sōusuǒ","to search","Seek-and-seek. Two near-synonyms doubled up, which Chinese does often."],
    ["死机","sǐjī","to crash","Dead machine. Blunt and perfect."]
  ]},
  art:    { icon: "🎨", name: "Art & design", zh: "艺术", words: [
    ["艺术","yìshù","art","Skill-technique. Both halves once meant a practical craft."],
    ["国画","guóhuà","Chinese painting","National painting. Ink on paper or silk, named to distinguish it from oils."],
    ["水墨","shuǐmò","ink wash","Water-ink. The whole tradition rests on how much water is in the brush."],
    ["颜色","yánsè","colour","Face-colour. 颜 is the complexion of a face; the word widened from there."],
    ["设计","shèjì","design","Set out a plan. Also the noun, and the verb to design."],
    ["印章","yìnzhāng","seal, chop","The red stamp on a painting. The 汉 in this app's own header is set in one."],
    ["对称","duìchèn","symmetry","Facing-balance. The organising principle of most Chinese characters."],
    ["留白","liúbái","negative space","Leave white. In painting, the unpainted part is considered part of the composition."]
  ]},
  business:{ icon: "💼", name: "Work & business", zh: "工作", words: [
    ["公司","gōngsī","company","Public office. 上班 is to go to work; 下班 is to leave."],
    ["同事","tóngshì","colleague","Same-matter. The person you share the work with."],
    ["开会","kāihuì","to hold a meeting","Open-meet. 会 is both the meeting and the verb can."],
    ["加班","jiābān","to work overtime","Add-shift. The 996 debate — nine to nine, six days — is about this word."],
    ["工资","gōngzī","wages","Work-resources. 资 is capital or funds."],
    ["老板","lǎobǎn","boss","Old board. Originally the shopkeeper behind the counter."],
    ["合作","hézuò","to cooperate","Join-make. Also partnership."],
    ["面试","miànshì","job interview","Face-test. The 试 is the same one in 考试 exam."]
  ]}
};

const INTEREST_KEYS = Object.keys(INTERESTS);

const MENU_TIERS = [
  { n: 1, at: 0,  label: "Dish names only" },
  { n: 2, at: 15, label: "With descriptions" },
  { n: 3, at: 30, label: "Full menu, specials board and all" }
];

const QUESTS = [
  { id:"menu",   icon:"🍜", name:"Read a Menu",   zh:"看菜单", open:true,
    promise:"Walk into a restaurant in China, read the wall, and order out loud.",
    chars: MENU_CHARS, menu: MENU },
  { id:"story",  icon:"📖", name:"Read a Story",  zh:"读故事", locked:true,
    promise:"A short story, then a news item — sentences instead of signs.", needs:"Read a Menu" },
  { id:"street", icon:"🚦", name:"Find Your Way", zh:"问路",   locked:true,
    promise:"Read street signs, station boards and exit numbers.", needs:"Read a Story" },
  { id:"shop",   icon:"🛒", name:"Buy Something", zh:"买东西", locked:true,
    promise:"Prices, sizes, receipts and haggling.",              needs:"Find Your Way" },
  { id:"chat",   icon:"💬", name:"Small Talk",    zh:"聊天",   locked:true,
    promise:"Hold a short conversation about yourself.",          needs:"Buy Something" }
];
