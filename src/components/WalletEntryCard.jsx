import React, { useState, useRef } from 'react';
import { Card, Form, InputGroup, Button, Badge, ListGroup, Collapse } from 'react-bootstrap';
import { FaTrash, FaEye, FaEyeSlash as FaHide, FaCheck, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Import bip39 library (already available in the project)
let bip39;
try {
    bip39 = require('bip39');
    // bip39 library loaded successfully
} catch (error) {
    bip39 = null;
}

// BIP39 wordlist (first 100 words for demo - in production you'd import the full list)
const BIP39_SAMPLE_WORDS = [
    "abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse",
"access","accident","account","accuse","achieve","acid","acoustic","acquire","across","act",
"action","actor","actress","actual","adapt","add","addict","address","adjust","admit",
"adult","advance","advice","aerobic","affair","afford","afraid","again","age","agent",
"agree","ahead","aim","air","airport","aisle","alarm","album","alcohol","alert",
"alien","all","alley","allow","almost","alone","alpha","already","also","alter",
"always","amateur","amazing","among","amount","amused","analyst","anchor","ancient","anger",
"angle","angry","animal","ankle","announce","annual","another","answer","antenna","antique",
"anxiety","any","apart","apology","appear","apple","approve","april","arch","arctic",
"area","arena","argue","arm","armed","armor","army","around","arrange","arrest",
"arrive","arrow","art","artefact","artist","artwork","ask","aspect","assault","asset",
"assist","assume","asthma","athlete","atom","attack","attend","attitude","attract","auction",
"audit","august","aunt","author","auto","autumn","average","avocado","avoid","awake",
"aware","away","awesome","awful","awkward","axis","baby","bachelor","bacon","badge",
"bag","balance","balcony","ball","bamboo","banana","banner","bar","barely","bargain",
"barrel","base","basic","basket","battle","beach","bean","beauty","because","become",
"beef","before","begin","behave","behind","believe","below","belt","bench","benefit",
"best","betray","better","between","beyond","bicycle","bid","bike","bind","biology",
"bird","birth","bitter","black","blade","blame","blanket","blast","bleak","bless",
"blind","blood","blossom","blouse","blue","blur","blush","board","boat","body",
"boil","bomb","bone","bonus","book","boost","border","boring","borrow","boss",
"bottom","bounce","box","boy","bracket","brain","brand","brass","brave","bread",
"breeze","brick","bridge","brief","bright","bring","brisk","broccoli","broken","bronze",
"broom","brother","brown","brush","bubble","buddy","budget","buffalo","build","bulb",
"bulk","bullet","bundle","bunker","burden","burger","burst","bus","business","busy",
"butter","buyer","buzz","cabbage","cabin","cable","cactus","cage","cake","call",
"calm","camera","camp","can","canal","cancel","candy","cannon","canoe","canvas",
"canyon","capable","capital","captain","car","carbon","card","cargo","carpet","carry",
"cart","case","cash","casino","castle","casual","cat","catalog","catch","category",
"cattle","caught","cause","caution","cave","ceiling","celery","cement","census","century",
"cereal","certain","chair","chalk","champion","change","chaos","chapter","charge","chase",
"chat","cheap","check","cheese","chef","cherry","chest","chicken","chief","child",
"chimney","choice","choose","chronic","chuckle","chunk","churn","cigar","cinnamon","circle",
"citizen","city","civil","claim","clap","clarify","claw","clay","clean","clerk",
"clever","click","client","cliff","climb","clinic","clip","clock","clog","close",
"cloth","cloud","clown","club","clump","cluster","clutch","coach","coast","coconut",
"code","coffee","coil","coin","collect","color","column","combine","come","comfort",
"comic","common","company","concert","conduct","confirm","congress","connect","consider","control",
"convince","cook","cool","copper","copy","coral","core","corn","correct","cost",
"cotton","couch","country","couple","course","cousin","cover","coyote","crack","cradle",
"craft","cram","crane","crash","crater","crawl","crazy","cream","credit","creek",
"crew","cricket","crime","crisp","critic","crop","cross","crouch","crowd","crucial",
"cruel","cruise","crumble","crunch","crush","cry","crystal","cube","culture","cup",
"cupboard","curious","current","curtain","curve","cushion","custom","cute","cycle","dad",
"damage","damp","dance","danger","daring","dash","daughter","dawn","day","deal",
"debate","debris","decade","december","decide","decline","decorate","decrease","deer","defense",
"define","defy","degree","delay","deliver","demand","demise","denial","dentist","deny",
"depart","depend","deposit","depth","deputy","derive","describe","desert","design","desk",
"despair","destroy","detail","detect","develop","device","devote","diagram","dial","diamond",
"diary","dice","diesel","diet","differ","digital","dignity","dilemma","dinner","dinosaur",
"direct","dirt","disagree","discover","disease","dish","dismiss","disorder","display","distance",
"divert","divide","divorce","dizzy","doctor","document","dog","doll","dolphin","domain",
"donate","donkey","donor","door","dose","double","dove","draft","dragon","drama",
"drastic","draw","dream","dress","drift","drill","drink","drip","drive","drop",
"drum","dry","duck","dumb","dune","during","dust","dutch","duty","dwarf",
"dynamic","eager","eagle","early","earn","earth","easily","east","easy","echo",
"ecology","economy","edge","edit","educate","effort","egg","eight","either","elbow",
"elder","electric","elegant","element","elephant","elevator","elite","else","embark","embody",
"embrace","emerge","emotion","employ","empower","empty","enable","enact","end","endless",
"endorse","enemy","energy","enforce","engage","engine","enhance","enjoy","enlist","enough",
"enrich","enroll","ensure","enter","entire","entry","envelope","episode","equal","equip",
"era","erase","erode","erosion","error","erupt","escape","essay","essence","estate",
"eternal","ethics","evidence","evil","evoke","evolve","exact","example","excess","exchange",
"excite","exclude","excuse","execute","exercise","exhaust","exhibit","exile","exist","exit",
"exotic","expand","expect","expire","explain","expose","express","extend","extra","eye",
"eyebrow","fabric","face","faculty","fade","faint","faith","fall","false","fame",
"family","famous","fan","fancy","fantasy","farm","fashion","fat","fatal","father",
"fatigue","fault","favorite","feature","february","federal","fee","feed","feel","female",
"fence","festival","fetch","fever","few","fiber","fiction","field","figure","file",
"film","filter","final","find","fine","finger","finish","fire","firm","first",
"fiscal","fish","fit","fitness","fix","flag","flame","flash","flat","flavor",
"flee","flight","flip","float","flock","floor","flower","fluid","flush","fly",
"foam","focus","fog","foil","fold","follow","food","foot","force","forest",
"forget","fork","fortune","forum","forward","fossil","foster","found","fox","fragile",
"frame","frequent","fresh","friend","fringe","frog","front","frost","frown","frozen",
"fruit","fuel","fun","funny","furnace","fury","future","gadget","gain","galaxy",
"gallery","game","gap","garage","garbage","garden","garlic","garment","gas","gasp",
"gate","gather","gauge","gaze","general","genius","genre","gentle","genuine","gesture",
"ghost","giant","gift","giggle","ginger","giraffe","girl","give","glad","glance",
"glare","glass","glide","glimpse","globe","gloom","glory","glove","glow","glue",
"goat","goddess","gold","good","goose","gorilla","gospel","gossip","govern","gown",
"grab","grace","grain","grant","grape","grass","gravity","great","green","grid",
"grief","grit","grocery","group","grow","grunt","guard","guess","guide","guilt",
"guitar","gun","gym","habit","hair","half","hammer","hamster","hand","happy",
"harbor","hard","harsh","harvest","hat","have","hawk","hazard","head","health",
"heart","heavy","hedgehog","height","hello","helmet","help","hen","hero","hidden",
"high","hill","hint","hip","hire","history","hobby","hockey","hold","hole",
"holiday","hollow","home","honey","hood","hope","horn","horror","horse","hospital",
"host","hotel","hour","hover","hub","huge","human","humble","humor","hundred",
"hungry","hunt","hurdle","hurry","hurt","husband","hybrid","ice","icon","idea",
"identify","idle","ignore","ill","illegal","illness","image","imitate","immense","immune",
"impact","impose","improve","impulse","inch","include","income","increase","index","indicate",
"indoor","industry","infant","inflict","inform","inhale","inherit","initial","inject","injury",
"inmate","inner","innocent","input","inquiry","insane","insect","inside","inspire","install",
"intact","interest","into","invest","invite","involve","iron","island","isolate","issue",
"item","ivory","jacket","jaguar","jar","jazz","jealous","jeans","jelly","jewel",
"job","join","joke","journey","joy","judge","juice","jump","jungle","junior",
"junk","just","kangaroo","keen","keep","ketchup","key","kick","kid","kidney",
"kind","kingdom","kiss","kit","kitchen","kite","kitten","kiwi","knee","knife",
"knock","know","lab","label","labor","ladder","lady","lake","lamp","language",
"laptop","large","later","latin","laugh","laundry","lava","law","lawn","lawsuit",
"layer","lazy","leader","leaf","learn","leave","lecture","left","leg","legal",
"legend","leisure","lemon","lend","length","lens","leopard","lesson","letter","level",
"liar","liberty","library","license","life","lift","light","like","limb","limit",
"link","lion","liquid","list","little","live","lizard","load","loan","lobster",
"local","lock","logic","lonely","long","loop","lottery","loud","lounge","love",
"loyal","lucky","luggage","lumber","lunar","lunch","luxury","lyrics","machine","mad",
"magic","magnet","maid","mail","main","major","make","mammal","man","manage",
"mandate","mango","mansion","manual","maple","marble","march","margin","marine","market",
"marriage","mask","mass","master","match","material","math","matrix","matter","maximum",
"maze","meadow","mean","measure","meat","mechanic","medal","media","melody","melt",
"member","memory","mention","menu","mercy","merge","merit","merry","mesh","message",
"metal","method","middle","midnight","milk","million","mimic","mind","minimum","minor",
"minute","miracle","mirror","misery","miss","mistake","mix","mixed","mixture","mobile",
"model","modify","mom","moment","monitor","monkey","monster","month","moon","moral",
"more","morning","mosquito","mother","motion","motor","mountain","mouse","move","movie",
"much","muffin","mule","multiply","muscle","museum","mushroom","music","must","mutual",
"myself","mystery","myth","naive","name","napkin","narrow","nasty","nation","nature",
"near","neck","need","negative","neglect","neither","nephew","nerve","nest","net",
"network","neutral","never","news","next","nice","night","noble","noise","nominee",
"noodle","normal","north","nose","notable","note","nothing","notice","novel","now",
"nuclear","number","nurse","nut","oak","obey","object","oblige","obscure","observe",
"obtain","obvious","occur","ocean","october","odor","off","offer","office","often",
"oil","okay","old","olive","olympic","omit","once","one","onion","online",
"only","open","opera","opinion","oppose","option","orange","orbit","orchard","order",
"ordinary","organ","orient","original","orphan","ostrich","other","outdoor","outer","output",
"outside","oval","oven","over","own","owner","oxygen","oyster","ozone","pact",
"paddle","page","pair","palace","palm","panda","panel","panic","panther","paper",
"parade","parent","park","parrot","party","pass","patch","path","patient","patrol",
"pattern","pause","pave","payment","peace","peanut","pear","peasant","pelican","pen",
"penalty","pencil","people","pepper","perfect","permit","person","pet","phone","photo",
"phrase","physical","piano","picnic","picture","piece","pig","pigeon","pill","pilot",
"pink","pioneer","pipe","pistol","pitch","pizza","place","planet","plastic","plate",
"play","please","pledge","pluck","plug","plunge","poem","poet","point","polar",
"pole","police","pond","pony","pool","popular","portion","position","possible","post",
"potato","pottery","poverty","powder","power","practice","praise","predict","prefer","prepare",
"present","pretty","prevent","price","pride","primary","print","priority","prison","private",
"prize","problem","process","produce","profit","program","project","promote","proof","property",
"prosper","protect","proud","provide","public","pudding","pull","pulp","pulse","pumpkin",
"punch","pupil","puppy","purchase","purity","purpose","purse","push","put","puzzle",
"pyramid","quality","quantum","quarter","question","quick","quit","quiz","quote","rabbit",
"raccoon","race","rack","radar","radio","rail","rain","raise","rally","ramp",
"ranch","random","range","rapid","rare","rate","rather","raven","raw","razor",
"ready","real","reason","rebel","rebuild","recall","receive","recipe","record","recycle",
"reduce","reflect","reform","refuse","region","regret","regular","reject","relax","release",
"relief","rely","remain","remember","remind","remove","render","renew","rent","reopen",
"repair","repeat","replace","report","require","rescue","resemble","resist","resource","response",
"result","retire","retreat","return","reunion","reveal","review","reward","rhythm","rib",
"ribbon","rice","rich","ride","ridge","rifle","right","rigid","ring","riot",
"ripple","risk","ritual","rival","river","road","roast","robot","robust","rocket",
"romance","roof","rookie","room","rose","rotate","rough","round","route","royal",
"rubber","rude","rug","rule","run","runway","rural","sad","saddle","sadness",
"safe","sail","salad","salmon","salon","salt","salute","same","sample","sand",
"satisfy","satoshi","sauce","sausage","save","say","scale","scan","scare","scatter",
"scene","scheme","school","science","scissors","scorpion","scout","scrap","screen","script",
"scrub","sea","search","season","seat","second","secret","section","security","seed",
"seek","segment","select","sell","seminar","senior","sense","sentence","series","service",
"session","settle","setup","seven","shadow","shaft","shallow","share","shed","shell",
"sheriff","shield","shift","shine","ship","shiver","shock","shoe","shoot","shop",
"short","shoulder","shove","shrimp","shrug","shuffle","shy","sibling","sick","side",
"siege","sight","sign","silent","silk","silly","silver","similar","simple","since",
"sing","siren","sister","situate","six","size","skate","sketch","ski","skill",
"skin","skirt","skull","slab","slam","sleep","slender","slice","slide","slight",
"slim","slogan","slot","slow","slush","small","smart","smile","smoke","smooth",
"snack","snake","snap","sniff","snow","soap","soccer","social","sock","soda",
"soft","solar","soldier","solid","solution","solve","someone","song","soon","sorry",
"sort","soul","sound","soup","source","south","space","spare","spatial","spawn",
"speak","special","speed","spell","spend","sphere","spice","spider","spike","spin",
"spirit","split","spoil","sponsor","spoon","sport","spot","spray","spread","spring",
"spy","square","squeeze","squirrel","stable","stadium","staff","stage","stairs","stamp",
"stand","start","state","stay","steak","steel","stem","step","stereo","stick",
"still","sting","stock","stomach","stone","stool","story","stove","strategy","street",
"strike","strong","struggle","student","stuff","stumble","style","subject","submit","subway",
"success","such","sudden","suffer","sugar","suggest","suit","summer","sun","sunny",
"sunset","super","supply","supreme","sure","surface","surge","surprise","surround","survey",
"suspect","sustain","swallow","swamp","swap","swarm","swear","sweet","swift","swim",
"swing","switch","sword","symbol","symptom","syrup","system","table","tackle","tag",
"tail","talent","talk","tank","tape","target","task","taste","tattoo","taxi",
"teach","team","tell","ten","tenant","tennis","tent","term","test","text",
"thank","that","theme","then","theory","there","they","thing","this","thought",
"three","thrive","throw","thumb","thunder","ticket","tide","tiger","tilt","timber",
"time","tiny","tip","tired","tissue","title","toast","tobacco","today","toddler",
"toe","together","toilet","token","tomato","tomorrow","tone","tongue","tonight","tool",
"tooth","top","topic","topple","torch","tornado","tortoise","toss","total","tourist",
"toward","tower","town","toy","track","trade","traffic","tragic","train","transfer",
"trap","trash","travel","tray","treat","tree","trend","trial","tribe","trick",
"trigger","trim","trip","trophy","trouble","truck","true","truly","trumpet","trust",
"truth","try","tube","tuition","tumble","tuna","tunnel","turkey","turn","turtle",
"twelve","twenty","twice","twin","twist","two","type","typical","ugly","umbrella",
"unable","unaware","uncle","uncover","under","undo","unfair","unfold","unhappy","uniform",
"unique","unit","universe","unknown","unlock","until","unusual","unveil","update","upgrade",
"uphold","upon","upper","upset","urban","urge","usage","use","used","useful",
"useless","usual","utility","vacant","vacuum","vague","valid","valley","valve","van",
"vanish","vapor","various","vast","vault","vehicle","velvet","vendor","venture","venue",
"verb","verify","version","very","vessel","veteran","viable","vibrant","vicious","victory",
"video","view","village","vintage","violin","virtual","virus","visa","visit","visual",
"vital","vivid","vocal","voice","void","volcano","volume","vote","voyage","wage",
"wagon","wait","walk","wall","walnut","want","warfare","warm","warrior","wash",
"wasp","waste","water","wave","way","wealth","weapon","wear","weasel","weather",
"web","wedding","weekend","weird","welcome","west","wet","whale","what","wheat",
"wheel","when","where","whip","whisper","wide","width","wife","wild","will",
"win","window","wine","wing","wink","winner","winter","wire","wisdom","wise",
"wish","witness","wolf","woman","wonder","wood","wool","word","work","world",
"worry","worth","wrap","wreck","wrestle","wrist","write","wrong","yard","year",
"yellow","you","young","youth","zebra","zero","zone","zoo"
];

function WalletEntryCard({ 
    entry, 
    index, 
    onUpdate, 
    onRemove, 
    isFieldVisible, 
    onToggleVisibility,
    isExpanded = false,
    onToggleExpanded,
    entryMode = 'view',
    onSave,
    onCancel,
    onEdit
}) {
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
    const [, setCurrentWordIndex] = useState(-1);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef(null);

    const handleFieldChange = (field, value) => {
        onUpdate(index, field, value);
        
        // Handle autocomplete for seed field
        if (field === 'seed') {
            handleSeedAutocomplete(value);
        }
    };

    const handleRemove = () => {
        onRemove(index);
    };

    const handleToggleVisibility = (field) => {
        onToggleVisibility(field);
    };

    // Get BIP39 wordlist (use bip39 library if available, fallback to sample)
    const getBIP39Wordlist = () => {
        if (bip39 && bip39.wordlists && bip39.wordlists.english) {
            return bip39.wordlists.english;
        }
        return BIP39_SAMPLE_WORDS;
    };

    // Handle autocomplete for seed phrase
    const handleSeedAutocomplete = (seedValue) => {
        if (!seedValue) {
            setShowAutocomplete(false);
            return;
        }

        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = seedValue.slice(0, cursorPos);
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];
        const wordIndex = words.length - 1;

        setCursorPosition(cursorPos);
        setCurrentWordIndex(wordIndex);

        // Get the wordlist for validation
        const wordlist = getBIP39Wordlist();

        // Don't show autocomplete if:
        // 1. Current word is empty
        // 2. Current word is too long (>7 chars, likely complete)
        // 3. Current word is already a complete BIP39 word
        // 4. Cursor is not at the end of the current word (user is editing middle)
        const isAtEndOfCurrentWord = cursorPos === textBeforeCursor.length;
        const isCompleteWord = wordlist.includes(currentWord.toLowerCase());
        const isReasonableLength = currentWord.length > 0 && currentWord.length <= 7;

        if (currentWord && isAtEndOfCurrentWord && isReasonableLength && !isCompleteWord) {
            const suggestions = wordlist
                .filter(word => word.startsWith(currentWord.toLowerCase()))
                .slice(0, 6); // Limit to 6 suggestions

            if (suggestions.length > 0) {
                setAutocompleteSuggestions(suggestions);
                setShowAutocomplete(true);
            } else {
                setShowAutocomplete(false);
            }
        } else {
            setShowAutocomplete(false);
        }
    };

    // Handle autocomplete selection
    const selectAutocomplete = (suggestion) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const seedValue = entry.seed;
        const cursorPos = cursorPosition;
        const textBeforeCursor = seedValue.slice(0, cursorPos);
        const textAfterCursor = seedValue.slice(cursorPos);
        
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];
        
        // Replace the current word with the suggestion
        const newTextBefore = textBeforeCursor.slice(0, textBeforeCursor.length - currentWord.length) + suggestion;
        const newSeedValue = newTextBefore + ' ' + textAfterCursor;
        
        handleFieldChange('seed', newSeedValue);
        setShowAutocomplete(false);
        
        // Focus back to textarea and position cursor after the completed word
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = newTextBefore.length + 1;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // Handle keyboard navigation in autocomplete
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setShowAutocomplete(false);
        }
    };

    // Handle paste events - hide autocomplete immediately when pasting
    const handlePaste = (e) => {
        setShowAutocomplete(false);
        // Let the paste event proceed normally
    };

    // Get real-time word validation
    const getWordValidation = (seedPhrase) => {
        if (!seedPhrase) return { validWords: [], invalidWords: [], totalWords: 0 };
        
        const words = seedPhrase.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const wordlist = getBIP39Wordlist();
        
        const validWords = [];
        const invalidWords = [];
        
        words.forEach((word, idx) => {
            if (wordlist.includes(word)) {
                validWords.push({ word, index: idx });
            } else if (word.length > 0) {
                invalidWords.push({ word, index: idx });
            }
        });
        
        return { validWords, invalidWords, totalWords: words.length };
    };

    // Enhanced seed phrase validation with BIP39 checksum
    const validateSeedPhrase = (seedPhrase) => {
        if (!seedPhrase || !seedPhrase.trim()) {
            return { isValid: false, message: '', wordCount: 0, type: 'empty' };
        }

        const cleanSeed = seedPhrase.trim().toLowerCase();
        const words = cleanSeed.split(/\s+/);
        const wordCount = words.length;
        
        // Check word count (common seed phrase lengths)
        const validLengths = [12, 15, 18, 21, 24];
        const isValidLength = validLengths.includes(wordCount);
        
        let message = '';
        let isValid = false;
        let type = 'invalid';
        let details = [];
        
        if (wordCount < 12) {
            message = `Need at least 12 words`;
            type = 'short';
        } else if (!isValidLength) {
            message = `Invalid length - use 12, 15, 18, 21, or 24 words`;
            type = 'invalid_length';
        } else {
            // Use bip39 library for comprehensive validation if available
            if (bip39 && bip39.wordlists && bip39.wordlists.english) {
                try {
                    // First check if all words are in the BIP39 wordlist
                    const invalidWords = words.filter(word => !bip39.wordlists.english.includes(word));
                    
                    if (invalidWords.length > 0) {
                        message = `Invalid word${invalidWords.length > 1 ? 's' : ''} detected`;
                        type = 'invalid_words';
                        details = invalidWords;
                    } else {
                        // All words are valid, now check the checksum
                        const isValidMnemonic = bip39.validateMnemonic(cleanSeed);
                        
                        if (isValidMnemonic) {
                            message = `Valid seed phrase! ✨`;
                            isValid = true;
                            type = 'valid';
                        } else {
                            message = `Checksum invalid`;
                            type = 'invalid_checksum';
                            details = ['Words are valid but in wrong order or corrupted'];
                        }
                    }
                } catch (error) {
                    message = `${wordCount} words - validation error`;
                    type = 'error';
                    details = ['Unable to validate seed phrase: ' + error.message];
                }
            } else {
                // Fallback validation without bip39 library
                const invalidWords = words.filter(word => 
                    word.length > 0 && !BIP39_SAMPLE_WORDS.includes(word)
                );
                
                if (invalidWords.length > 0) {
                    message = `Potentially invalid word${invalidWords.length > 1 ? 's' : ''} detected`;
                    type = 'invalid_words';
                    details = invalidWords;
                } else {
                    message = `Basic validation passed (checksum not verified)`;
                    type = 'partial_valid';
                    details = ['Full validation requires bip39 library'];
                }
            }
        }
        
        return { isValid, message, wordCount, type, details };
    };

    // Private key validation for various formats
    const validatePrivateKey = (privateKey) => {
        if (!privateKey || !privateKey.trim()) {
            return { isValid: true, message: '', type: 'empty' }; // Optional field
        }

        const cleanKey = privateKey.trim();
        let message = '';
        let isValid = false;
        let type = 'invalid';
        let format = '';
        let details = [];

        // Check for common private key formats
        
        // 1. Raw Hex (64 characters, 32 bytes)
        const hexPattern = /^[0-9a-fA-F]{64}$/;
        if (hexPattern.test(cleanKey)) {
            // Additional validation: ensure it's not all zeros or all Fs
            if (cleanKey === '0'.repeat(64)) {
                message = 'Invalid - all zeros';
                type = 'invalid_zero';
                details = ['Private key cannot be all zeros'];
            } else if (cleanKey.toLowerCase() === 'f'.repeat(64)) {
                message = 'Invalid - all Fs';
                type = 'invalid_max';
                details = ['Private key cannot be all Fs (max value)'];
            } else {
                message = 'Valid hex private key ✨';
                isValid = true;
                type = 'valid';
                format = 'Raw Hex (64 chars)';
            }
        }
        
        // 2. WIF (Wallet Import Format) - Bitcoin
        else if (cleanKey.length >= 51 && cleanKey.length <= 52) {
            // WIF starts with 5, K, or L for Bitcoin mainnet
            const wifPattern = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/;
            if (wifPattern.test(cleanKey)) {
                // Basic WIF format validation
                if (cleanKey.startsWith('5')) {
                    message = 'Valid WIF (uncompressed) ✨';
                    isValid = true;
                    type = 'valid';
                    format = 'WIF Uncompressed';
                } else if (cleanKey.startsWith('K') || cleanKey.startsWith('L')) {
                    message = 'Valid WIF (compressed) ✨';
                    isValid = true;
                    type = 'valid';
                    format = 'WIF Compressed';
                }
            } else {
                message = 'Invalid WIF format';
                type = 'invalid_wif';
                details = ['WIF should start with 5, K, or L and be 51-52 characters'];
            }
        }
        
        // 3. Base58 format (other cryptocurrencies)
        else if (cleanKey.length >= 44 && cleanKey.length <= 58) {
            const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
            if (base58Pattern.test(cleanKey)) {
                message = 'Valid Base58 format ✨';
                isValid = true;
                type = 'valid';
                format = 'Base58 Encoded';
            } else {
                message = 'Invalid Base58 characters';
                type = 'invalid_base58';
                details = ['Contains invalid Base58 characters (0, O, I, l)'];
            }
        }
        
        // 4. Ethereum private key (0x prefix)
        else if (cleanKey.startsWith('0x') && cleanKey.length === 66) {
            const ethHexPattern = /^0x[0-9a-fA-F]{64}$/;
            if (ethHexPattern.test(cleanKey)) {
                const keyWithoutPrefix = cleanKey.slice(2);
                if (keyWithoutPrefix === '0'.repeat(64)) {
                    message = 'Invalid - all zeros';
                    type = 'invalid_zero';
                    details = ['Private key cannot be all zeros'];
                } else if (keyWithoutPrefix.toLowerCase() === 'f'.repeat(64)) {
                    message = 'Invalid - all Fs';
                    type = 'invalid_max';
                    details = ['Private key cannot be all Fs (max value)'];
                } else {
                    message = 'Valid Ethereum private key ✨';
                    isValid = true;
                    type = 'valid';
                    format = 'Ethereum (0x prefixed)';
                }
            } else {
                message = 'Invalid Ethereum hex format';
                type = 'invalid_eth_hex';
                details = ['Should be 0x followed by 64 hex characters'];
            }
        }
        
        // 5. Check for common mistakes
        else if (cleanKey.length < 32) {
            message = 'Too short for private key';
            type = 'too_short';
            details = ['Private keys are typically 32+ bytes (64+ hex chars)'];
        } else if (cleanKey.length > 100) {
            message = 'Too long for private key';
            type = 'too_long';
            details = ['Private keys are typically under 100 characters'];
        } else {
            // Check if it looks like hex but wrong length
            const partialHexPattern = /^[0-9a-fA-F]+$/;
            if (partialHexPattern.test(cleanKey)) {
                message = `Invalid hex length (${cleanKey.length} chars)`;
                type = 'invalid_hex_length';
                details = [`Expected 64 characters for raw hex, got ${cleanKey.length}`];
            } else {
                message = 'Unrecognized format';
                type = 'unknown_format';
                details = ['Supported: Raw Hex (64 chars), WIF, Base58, Ethereum (0x prefix)'];
            }
        }

        return { isValid, message, type, format, details };
    };

    const seedValidation = validateSeedPhrase(entry.seed);
    const wordValidation = getWordValidation(entry.seed);
    const privateKeyValidation = validatePrivateKey(entry.privateKey);

    // Get appropriate badge color based on validation type
    // eslint-disable-next-line no-unused-vars -- reserved for badge styling
    const _getBadgeVariant = (validation) => {
        const variant = validation.isValid ? 'success' :
                       validation.type === 'short' || validation.type === 'empty' ? 'secondary' :
                       validation.type === 'invalid_checksum' ? 'danger' :
                       validation.type === 'partial_valid' ? 'info' : 'warning';
        
        return variant;
    };

    // Get appropriate form control class
    const getFormControlClass = (validation) => {
        if (!entry.seed) return '';
        if (validation.isValid) return 'is-valid';
        if (validation.type === 'invalid_checksum') return 'is-invalid';
        return '';
    };

    // Get summary info for collapsed state (reactive to entry changes)
    const summaryInfo = React.useMemo(() => {
        const name = entry.name || 'New Wallet Entry';
        const hasSeed = !!entry.seed;
        const hasPrivateKey = !!entry.privateKey;
        const hasAddress = !!entry.address;
        
        // Check private key validity if provided
        const privateKeyStatus = hasPrivateKey ? 
            (validatePrivateKey(entry.privateKey).isValid ? 'valid' : 'invalid') : 
            'none';
        
        return { name, hasSeed, hasPrivateKey, hasAddress, privateKeyStatus };
    }, [entry.name, entry.seed, entry.privateKey, entry.address]);

    // Check for validation issues (only show if entry has content)
    const hasValidationIssues = React.useMemo(() => {
        // Don't show validation errors if entry is completely empty (new entry)
        const hasAnyContent = entry.name || entry.seed || entry.privateKey || entry.address || entry.notes;
        if (!hasAnyContent) return false;
        
        // Only show validation issues if we're in view mode
        if (entryMode !== 'view') return false;
        
        // Basic field validation - name is required
        if (!entry.name) {
            return true;
        }
        
        // Must have either a valid seed phrase OR a valid private key (or both)
        const hasSeed = !!entry.seed;
        const hasPrivateKey = !!entry.privateKey;
        
        // If neither seed nor private key is provided
        if (!hasSeed && !hasPrivateKey) {
            return true;
        }
        
        // Validate seed phrase if provided
        if (hasSeed) {
            const seedValidation = validateSeedPhrase(entry.seed);
            if (!seedValidation.isValid) {
                return true;
            }
        }
        
        // Validate private key if provided
        if (hasPrivateKey) {
            const privateKeyValidation = validatePrivateKey(entry.privateKey);
            if (!privateKeyValidation.isValid) {
                return true;
            }
        }
        
        return false;
    }, [entry.name, entry.seed, entry.privateKey, entry.address, entry.notes, entryMode]);

    // Check if entry can be saved (for Save button)
    const canSave = React.useMemo(() => {
        if (!entry.name) return false;
        
        const hasSeed = !!entry.seed;
        const hasPrivateKey = !!entry.privateKey;
        
        // Must have either seed or private key
        if (!hasSeed && !hasPrivateKey) return false;
        
        // Validate seed phrase if provided
        if (hasSeed) {
            const seedValidation = validateSeedPhrase(entry.seed);
            if (!seedValidation.isValid) return false;
        }
        
        // Validate private key if provided
        if (hasPrivateKey) {
            const privateKeyValidation = validatePrivateKey(entry.privateKey);
            if (!privateKeyValidation.isValid) return false;
        }
        
        return true;
    }, [entry.name, entry.seed, entry.privateKey]);

    return (
        <Card className="mb-3 entry-card">
            <Card.Body>
                {/* Accordion Header */}
                <div 
                    className="d-flex justify-content-between align-items-center accordion-header"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onToggleExpanded && onToggleExpanded(index)}
                >
                    <div className="d-flex align-items-center flex-grow-1">
                        <div className="me-2">
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                        <div className="flex-grow-1">
                            <div className="d-flex align-items-center">
                                <h6 className="mb-0 me-2">
                                    {summaryInfo.name}
                                </h6>
                                {hasValidationIssues && (
                                    <FaExclamationTriangle className="text-warning me-2" size={14} />
                                )}
                                {!hasValidationIssues && entryMode === 'view' && (
                                    <FaCheck className="text-success me-2" size={14} />
                                )}
                            </div>
                            {!isExpanded && (
                                <small className="text-muted">
                                    {summaryInfo.hasSeed && 'Seed phrase set'}
                                    {summaryInfo.hasSeed && summaryInfo.hasPrivateKey && ' • '}
                                    {summaryInfo.hasPrivateKey && (
                                        <>
                                            {'Private key '}
                                            <span className={summaryInfo.privateKeyStatus === 'valid' ? 'text-success' : 'text-danger'}>
                                                {summaryInfo.privateKeyStatus === 'valid' ? '✓' : '✗'}
                                            </span>
                                        </>
                                    )}
                                    {!summaryInfo.hasSeed && !summaryInfo.hasPrivateKey && 'No credentials set'}
                                    {summaryInfo.hasAddress && ' • Address set'}
                                </small>
                            )}
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        {entryMode === 'view' && (
                            <>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit();
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                >
                                    <FaTrash />
                                </Button>
                            </>
                        )}
                        {entryMode === 'edit' && (
                            <>
                                <Button 
                                    variant="outline-secondary" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCancel();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSave();
                                    }}
                                    disabled={!canSave}
                                >
                                    Save
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Accordion Content */}
                <Collapse in={isExpanded}>
                    <div className="mt-3">
                        <Form.Group className="mb-2">
                            <Form.Label>Wallet Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., Main Bitcoin Wallet, MetaMask"
                                value={entry.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                disabled={entryMode === 'view'}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                            />
                        </Form.Group>

                        <Form.Group className="mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <Form.Label>Seed Phrase <small className="text-muted">(or use private key below)</small></Form.Label>
                        <div className="d-flex gap-2">
                            {/* Elegant word count indicator */}
                            {entry.seed && wordValidation.totalWords > 0 && (
                                <Badge 
                                    bg={wordValidation.invalidWords.length > 0 ? "warning" : "secondary"} 
                                    className="d-flex align-items-center"
                                >
                                    {wordValidation.totalWords} word{wordValidation.totalWords !== 1 ? 's' : ''}
                                    {wordValidation.invalidWords.length > 0 && (
                                        <span className="ms-1">({wordValidation.invalidWords.length} invalid)</span>
                                    )}
                                </Badge>
                            )}
                            {entry.seed && (() => {
                                const backgroundColor = 
                                    seedValidation.type === 'invalid_checksum' ? '#dc3545' :
                                    seedValidation.type === 'invalid_words' ? '#fd7e14' :
                                    seedValidation.type === 'error' ? '#dc3545' :
                                    seedValidation.isValid ? '#198754' : undefined;
                                
                                const color = 
                                    (seedValidation.type === 'invalid_checksum' || 
                                     seedValidation.type === 'invalid_words' || 
                                     seedValidation.type === 'error' || 
                                     seedValidation.isValid) ? '#ffffff' : undefined;

                                return (
                                    <span 
                                        className="d-flex align-items-center"
                                        style={{
                                            backgroundColor: backgroundColor,
                                            color: color,
                                            border: 'none',
                                            padding: '0.375rem 0.75rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            borderRadius: '0.375rem',
                                            lineHeight: '1'
                                        }}
                                    >
                                        {seedValidation.isValid ? (
                                            <><FaCheck className="me-1" /> {seedValidation.message}</>
                                        ) : (
                                            <><FaExclamationTriangle className="me-1" /> {seedValidation.message}</>
                                        )}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="position-relative">
                        <InputGroup>
                            <Form.Control
                                ref={textareaRef}
                                as="textarea"
                                rows={3}
                                placeholder="Start typing... (12, 15, 18, 21, or 24 words)"
                                value={entry.seed}
                                onChange={(e) => handleFieldChange('seed', e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                className={getFormControlClass(seedValidation)}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                                disabled={entryMode === 'view'}
                                style={{ 
                                    fontFamily: 'monospace',
                                    WebkitTextSecurity: isFieldVisible('seed') ? 'none' : 'disc'
                                }}
                            />
                            <Button 
                                variant="outline-secondary"
                                onClick={() => handleToggleVisibility('seed')}
                            >
                                {isFieldVisible('seed') ? <FaHide /> : <FaEye />}
                            </Button>
                        </InputGroup>
                        
                        {/* Autocomplete dropdown */}
                        {showAutocomplete && autocompleteSuggestions.length > 0 && (
                            <div className="position-absolute w-100" style={{ zIndex: 1000, top: '100%' }}>
                                <ListGroup className="shadow-lg border-0" style={{ 
                                    border: '1px solid #495057',
                                    borderRadius: '0.375rem',
                                    overflow: 'hidden'
                                }}>
                                    {autocompleteSuggestions.map((suggestion, idx) => (
                                        <ListGroup.Item
                                            key={idx}
                                            action
                                            onClick={() => selectAutocomplete(suggestion)}
                                            className="py-2 px-3 d-flex justify-content-between align-items-center border-0"
                                            style={{ 
                                                cursor: 'pointer', 
                                                fontSize: '0.95rem',
                                                backgroundColor: '#2d3748',
                                                color: '#ffffff',
                                                borderBottom: idx < autocompleteSuggestions.length - 1 ? '1px solid #4a5568' : 'none',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#4a5568';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = '#2d3748';
                                            }}
                                        >
                                            <span style={{ 
                                                fontFamily: 'monospace', 
                                                fontWeight: '600',
                                                color: '#68d391',
                                                fontSize: '1rem'
                                            }}>
                                                {suggestion}
                                            </span>
                                            <small style={{ 
                                                color: '#a0aec0',
                                                fontWeight: '500'
                                            }}>
                                                #{getBIP39Wordlist().indexOf(suggestion) + 1}
                                            </small>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </div>
                        )}
                    </div>
                    
                    {/* Enhanced feedback messages */}
                    {entry.seed && !seedValidation.isValid && seedValidation.details && seedValidation.details.length > 0 && (
                        <Form.Text className={seedValidation.type === 'invalid_checksum' ? 'text-danger' : 'text-warning'}>
                            <small>
                                {seedValidation.type === 'invalid_words' && (
                                    <>
                                        <strong>Invalid words:</strong> {seedValidation.details.join(', ')}
                                        <br />
                                        <em>These words are not in the BIP39 wordlist.</em>
                                    </>
                                )}
                                {seedValidation.type === 'invalid_checksum' && (
                                    <div style={{ lineHeight: '1.3' }}>
                                        <strong>Checksum validation failed!</strong>
                                        <br />
                                        <em>All words are valid, but the seed phrase is mathematically incorrect. 
                                        This could be due to words in wrong order, typos, or corruption.</em>
                                    </div>
                                )}
                                {(seedValidation.type === 'error' || seedValidation.type === 'invalid_length') && (
                                    <em>{seedValidation.details[0]}</em>
                                )}
                            </small>
                        </Form.Text>
                    )}
                    
                    {/* Success message for valid seeds */}
                    {entry.seed && seedValidation.isValid && (
                        <Form.Text className="text-success">
                            <small>
                                <strong>✅ Valid BIP39 seed phrase!</strong> Checksum verified.
                            </small>
                        </Form.Text>
                    )}

                    {/* Real-time word validation feedback */}
                    {entry.seed && wordValidation.invalidWords.length > 0 && (
                        <Form.Text className="text-warning">
                            <small>
                                <strong>⚠️ Invalid words:</strong> {wordValidation.invalidWords.map(w => w.word).join(', ')}
                            </small>
                        </Form.Text>
                    )}
                </Form.Group>

                <Form.Group className="mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <Form.Label>Private Key <small className="text-muted">(or use seed phrase above)</small></Form.Label>
                        {entry.privateKey && (
                            <div className="d-flex gap-2">
                                {/* Format indicator badge */}
                                {privateKeyValidation.format && (
                                    <Badge bg="info" className="d-flex align-items-center">
                                        {privateKeyValidation.format}
                                    </Badge>
                                )}
                                {/* Validation status badge */}
                                {(() => {
                                    const backgroundColor = 
                                        privateKeyValidation.type === 'invalid_zero' || 
                                        privateKeyValidation.type === 'invalid_max' ||
                                        privateKeyValidation.type === 'invalid_wif' ||
                                        privateKeyValidation.type === 'invalid_base58' ||
                                        privateKeyValidation.type === 'invalid_eth_hex' ||
                                        privateKeyValidation.type === 'invalid_hex_length' ? '#dc3545' :
                                        privateKeyValidation.type === 'too_short' ||
                                        privateKeyValidation.type === 'too_long' ||
                                        privateKeyValidation.type === 'unknown_format' ? '#fd7e14' :
                                        privateKeyValidation.isValid ? '#198754' : undefined;
                                    
                                    const color = backgroundColor ? '#ffffff' : undefined;

                                    return (
                                        <span 
                                            className="d-flex align-items-center"
                                            style={{
                                                backgroundColor: backgroundColor,
                                                color: color,
                                                border: 'none',
                                                padding: '0.375rem 0.75rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                borderRadius: '0.375rem',
                                                lineHeight: '1'
                                            }}
                                        >
                                            {privateKeyValidation.isValid ? (
                                                <><FaCheck className="me-1" /> {privateKeyValidation.message}</>
                                            ) : (
                                                <><FaExclamationTriangle className="me-1" /> {privateKeyValidation.message}</>
                                            )}
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    <InputGroup>
                        <Form.Control
                            type={isFieldVisible('privateKey') ? "text" : "password"}
                            placeholder="Raw hex, WIF, Base58, or 0x prefixed..."
                            value={entry.privateKey}
                            onChange={(e) => handleFieldChange('privateKey', e.target.value)}
                            className={entry.privateKey ? (privateKeyValidation.isValid ? 'is-valid' : 'is-invalid') : ''}
                            disabled={entryMode === 'view'}
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            autoComplete="off"
                            style={{ 
                                fontFamily: 'monospace'
                            }}
                        />
                        <Button 
                            variant="outline-secondary"
                            onClick={() => handleToggleVisibility('privateKey')}
                        >
                            {isFieldVisible('privateKey') ? <FaHide /> : <FaEye />}
                        </Button>
                    </InputGroup>
                    
                    {/* Private key validation feedback */}
                    {entry.privateKey && !privateKeyValidation.isValid && privateKeyValidation.details && privateKeyValidation.details.length > 0 && (
                        <Form.Text className={
                            privateKeyValidation.type === 'invalid_zero' || 
                            privateKeyValidation.type === 'invalid_max' ||
                            privateKeyValidation.type === 'invalid_wif' ||
                            privateKeyValidation.type === 'invalid_base58' ||
                            privateKeyValidation.type === 'invalid_eth_hex' ||
                            privateKeyValidation.type === 'invalid_hex_length' ? 'text-danger' : 'text-warning'
                        }>
                            <small>
                                <strong>
                                    {privateKeyValidation.type === 'invalid_zero' && '🚫 Invalid private key:'}
                                    {privateKeyValidation.type === 'invalid_max' && '🚫 Invalid private key:'}
                                    {privateKeyValidation.type === 'invalid_wif' && '⚠️ WIF format issue:'}
                                    {privateKeyValidation.type === 'invalid_base58' && '⚠️ Base58 issue:'}
                                    {privateKeyValidation.type === 'invalid_eth_hex' && '⚠️ Ethereum format issue:'}
                                    {privateKeyValidation.type === 'invalid_hex_length' && '⚠️ Hex length issue:'}
                                    {privateKeyValidation.type === 'too_short' && '⚠️ Length issue:'}
                                    {privateKeyValidation.type === 'too_long' && '⚠️ Length issue:'}
                                    {privateKeyValidation.type === 'unknown_format' && '❓ Format issue:'}
                                </strong> {privateKeyValidation.details[0]}
                            </small>
                        </Form.Text>
                    )}
                    
                    {/* Success message for valid private keys */}
                    {entry.privateKey && privateKeyValidation.isValid && (
                        <Form.Text className="text-success">
                            <small>
                                <strong>✅ Valid private key!</strong> Format: {privateKeyValidation.format}
                            </small>
                        </Form.Text>
                    )}
                </Form.Group>

                <Form.Group className="mb-2">
                    <Form.Label>Address (optional)</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Wallet address"
                        value={entry.address}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        disabled={entryMode === 'view'}
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                        autoComplete="off"
                    />
                </Form.Group>

                        <Form.Group className="mb-0">
                            <Form.Label>Context Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Purpose of this wallet, backup info, etc..."
                                value={entry.notes}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                disabled={entryMode === 'view'}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                            />
                        </Form.Group>
                    </div>
                </Collapse>
            </Card.Body>
        </Card>
    );
}

export default WalletEntryCard; 