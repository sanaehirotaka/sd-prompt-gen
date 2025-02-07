class PromptCategory {
    /**
     * @type {string}
     */
    category;
    /**
     * @type {PromptCategory|undefined}
     */
    parent;
    /**
     * @type {PromptCategory[]|Prompt[]}
     */
    children = [];
    /**
     * @type {Number[]}
     */
    rank = [];

    constructor(tree, category = undefined, parent = undefined, rank = []) {
        this.category = category;
        this.parent = parent;
        this.rank = [...rank];

        let leafRank = 0;
        if (Array.isArray(tree)) {
            for (const leaf of tree) {
                this.children.push(new Prompt(leaf, this, [...rank, leafRank++]));
            }
        } else {
            for (const subCategory in tree) {
                this.children.push(new PromptCategory(tree[subCategory], subCategory, this, [...rank, leafRank++]));
            }
        }
        Object.freeze(this);
    }

    /**
     * @param {string} japaneseText
     * @returns {Prompt|undefined}
     */
    findByJapaneseText(japaneseText) {
        return this[Symbol.iterator]().find(p => p.japaneseText == japaneseText);
    }

    /**
     * @param {string} text
     * @returns {Prompt|undefined}
     */
    findByText(text) {
        return this[Symbol.iterator]().find(p => p.text == text);
    }

    *[Symbol.iterator]() {
        for (const prompt of this.children) {
            if (prompt instanceof Prompt) {
                yield prompt;
            } else {
                yield* prompt;
            }
        }
    }
}
class Prompt {
    /**
     * @type {string}
     */
    japaneseText;
    /**
     * @type {string}
     */
    text;
    /**
     * @type {PromptCategory}
     */
    parent;
    /**
     * @type {Number[]}
     */
    rank = [];

    constructor([japaneseText, text], parent, rank) {
        this.japaneseText = japaneseText;
        this.text = text;
        this.parent = parent;
        this.rank = [...rank];
        Object.freeze(this);
    }

    get id() {
        return "prompt" + this.rank.join("-")
    }

    toString() {
        return this.text;
    }
}

class PromptGroup {
    /**
     * id
     */
    id = ((Math.random() * Math.pow(36, 8)) | 0).toString(36);
    /**
     * @type {(PromptGroup|Prompt)[]}
     */
    children = [];
    /**
     * @type {Number}
     */
    weight = undefined;
    /**
     * @type {PromptGroup}
     */
    parent = undefined;

    /**
     * @param {...(PromptGroup | Prompt) } prompts
     */
    constructor(...prompts) {
        this.append(...prompts);
    }
    /**
     * @param {...(PromptGroup | Prompt) } prompts
     */
    append(...prompts) {
        for (const prompt of prompts) {
            if (prompt instanceof PromptGroup) {
                if (prompt.parent) {
                    prompt.parent.remove(prompt);
                }
                prompt.parent = this;
            }
        }
        this.children.push(...prompts);
        this.children = this.children.sort(PromptGroup.compareTo);
    }
    /**
     * @param {(PromptGroup | Prompt)} prompt
     */
    remove(prompt) {
        this.children = this.children.filter(p => p !== prompt);
        if (this.children.length == 0) {
            this.parent?.remove(this);
        }
        this.children = this.children.filter(p => p instanceof Prompt || p.children.length != 0).sort(PromptGroup.compareTo);
    }
    /**
     * @param {Prompt} prompt
     * @returns {PromptGroup}
     */
    findGroup(prompt) {
        for (const child of this.children) {
            if (child == prompt) {
                return this;
            }
            if (child instanceof PromptGroup) {
                const find = child.findGroup(prompt);
                if (find)
                    return find;
            }
        }
        return undefined;
    }

    toString() {
        if (this.parent !== undefined) {
            if (this.weight !== undefined) {
                return `(${this.children.join(", ")}:${this.weight})`;
            }
            if (this.children.length > 1) {
                return `(${this.children.join(", ")})`;
            }
        }
        return this.children.join(", ");
    }
    /**
     * @returns {Element[]}
     */
    toElements() {
        const group = document.createElement("div");
        group.classList.add("group");
        if (this.parent != undefined && (this.weight !== undefined || this.children.length > 1 || this.children[0] instanceof PromptGroup)) {
            group.classList.add("braces");
        }
        for (const child of this.children) {
            if (child instanceof Prompt) {
                const button = document.createElement("input");
                button.classList.add("btn-check");
                button.setAttribute("type", "checkbox");
                button.setAttribute("id", "checked-" + this.id);
                button.setAttribute("autocomplete", "off");
                button.dataset.id = child.id;
                const label = document.createElement("label");
                label.classList.add("btn", "btn-sm", "btn-outline-secondary");
                label.setAttribute("for", "checked-" + this.id);
                label.append(child.japaneseText);

                group.append(button, label);
            } else {
                group.append(...child.toElements());
            }
        }
        if (this.weight !== undefined) {
            group.append(`:${this.weight}`);
        }
        return [group];
    }

    *getParents() {
        let parent = this.parent;
        while (parent) {
            yield parent;
            parent = parent.parent;
        }
    }

    get rank() {
        if (this.children.length > 0)
            return this.children[0].rank;
        return [];
    }

    static compareTo(a, b) {
        const rankA = a.rank;
        const rankB = b.rank;
        for (let i = 0, len = Math.max(rankA.length, rankB.length); i < len; i++) {
            const ret = (rankA[i] ?? -1) - (rankB[i] ?? -1);
            if (ret !== 0) {
                return ret;
            }
        }
        return rankA.length - rankB.length;
    }

    *[Symbol.iterator]() {
        for (const prompt of this.children) {
            if (prompt instanceof Prompt) {
                yield prompt;
            } else {
                yield* prompt;
            }
        }
    }
}

/**
 * @returns {PromptCategory}
 */
async function loadPrompt() {
    try {
        return await (await fetch("./data.json")).json();
    } catch {
        return {
            "基本情報": {
                "品質": [
                    ["最高傑作", "best quality"],
                    ["傑作", "masterpiece"],
                    ["高画質", "high quality"],
                    ["高解像度", "high resolution"],
                    ["詳細", "detailed"],
                    ["細部まで描き込まれた", "intricate details"],
                    ["鮮明", "sharp focus"],
                    ["クリア", "clear"],
                    ["正確な色", "accurate colors"],
                    ["鮮やかな色", "vibrant colors"],
                    ["美しい", "beautiful"],
                    ["綺麗", "gorgeous"],
                    ["完璧な構成", "perfect composition"],
                    ["プロフェッショナルな仕上がり", "professional quality"],
                    ["滑らかな質感", "smooth texture"],
                    ["優れたテクスチャ", "excellent texture"],
                    ["シャープなエッジ", "sharp edges"],
                    ["奥行きのある表現", "depth of field"],
                    ["完璧な陰影", "perfect shadows and highlights"],
                    ["美しい反射", "beautiful reflections"],
                    ["複雑なディテール", "complex details"],
                    ["高精細", "high definition"],
                    ["リアル", "realistic"],
                    ["現実的", "lifelike"],
                    ["芸術的な", "artistic"],
                    ["映画のような", "cinematic"],
                    ["スタジオ品質", "studio quality"],
                    ["自然な光", "natural lighting"],
                    ["ソフトな光", "soft lighting"],
                    ["ハイコントラスト", "high contrast"],
                    ["ローコントラスト", "low contrast"],
                    ["8k", "8k"],
                    ["4k", "4k"]
                ],
                "画風": [
                    ["写実的", "photorealistic"],
                    ["油絵風", "oil painting style"],
                    ["水彩画風", "watercolor style"],
                    ["イラスト風", "illustration style"],
                    ["3Dレンダリング", "3D rendering"],
                    ["ピクセルアート", "pixel art"],
                    ["アニメ風", "anime style"],
                    ["漫画風", "manga style"],
                    ["印象派", "impressionism"],
                    ["ゴッホ風", "van gogh style"],
                    ["クリムト風", "klimt style"],
                    ["アールヌーボー", "art nouveau"],
                    ["シュルレアリスム", "surrealism"]
                ],
                "シーン/背景": {
                    "場所": {
                        "室内": [
                            ["屋内", "indoors"],
                            ["リビング", "living room"],
                            ["ダイニングルーム", "dining room"],
                            ["キッチン", "kitchen"],
                            ["ベッドルーム", "bedroom"],
                            ["寝室", "boudoir"],
                            ["バスルーム", "bathroom"],
                            ["トイレ", "toilet"],
                            ["書斎", "study room"],
                            ["子供部屋", "children's room"],
                            ["ゲームルーム", "game room"],
                            ["ホームシアター", "home theater"],
                            ["クローゼット", "closet"],
                            ["ガレージ", "garage"],
                            ["オフィス", "office"],
                            ["応接室", "reception room"],
                            ["会議室", "conference room"],
                            ["カフェ", "cafe"],
                            ["レストラン", "restaurant"],
                            ["バー", "bar"],
                            ["クラブ", "club"],
                            ["ホテル", "hotel"],
                            ["ロビー", "lobby"],
                            ["客室", "guest room"],
                            ["スイートルーム", "suite room"],
                            ["学校", "school"],
                            ["教室", "classroom"],
                            ["体育館", "gymnasium"],
                            ["音楽室", "music room"],
                            ["美術室", "art room"],
                            ["理科室", "science lab"],
                            ["図書館", "library"],
                            ["講堂", "auditorium"],
                            ["ショッピングモール", "shopping mall"],
                            ["映画館", "movie theater"],
                            ["劇場", "theater"],
                            ["コンサートホール", "concert hall"],
                            ["病院", "hospital"],
                            ["診察室", "examination room"],
                            ["手術室", "operating room"],
                            ["病室", "hospital room"],
                            ["待合室", "waiting room"],
                            ["研究室", "laboratory"],
                            ["工場", "factory"],
                            ["写真スタジオ", "photo studio"],
                            ["録音スタジオ", "recording studio"],
                            ["ダンススタジオ", "dance studio"],
                            ["アトリエ", "atelier"],
                            ["ジム", "gym"],
                            ["スパ", "spa"],
                            ["プール", "pool"],
                            ["地下室", "basement"],
                            ["屋根裏部屋", "attic"],
                            ["エレベーター", "elevator"],
                            ["階段", "stairs"],
                            ["廊下", "hallway"],
                            ["倉庫", "warehouse"],
                            ["更衣室", "changing room"]
                        ],
                        "屋外": [
                            ["屋外", "outdoors"],
                            ["公園", "park"],
                            ["運動場", "athletic field"],
                            ["トラック", "running track"],
                            ["広場", "plaza"],
                            ["街中", "city"],
                            ["路地裏", "back alley"],
                            ["市場", "market"],
                            ["駅", "train station"],
                            ["空港", "airport"],
                            ["高層ビル", "skyscraper"],
                            ["橋", "bridge"],
                            ["トンネル", "tunnel"],
                            ["遊園地", "amusement park"],
                            ["スタジアム", "stadium"],
                            ["森林", "forest"],
                            ["山", "mountain"],
                            ["丘", "hill"],
                            ["草原", "grassland"],
                            ["海", "sea"],
                            ["海岸", "coast"],
                            ["川", "river"],
                            ["湖", "lake"],
                            ["滝", "waterfall"],
                            ["砂漠", "desert"],
                            ["熱帯雨林", "rainforest"],
                            ["サバンナ", "savanna"],
                            ["湿地", "wetland"],
                            ["洞窟", "cave"],
                            ["島", "island"],
                            ["雪山", "snowy mountain"],
                            ["火山", "volcano"],
                            ["峡谷", "canyon"],
                            ["農場", "farm"],
                            ["墓地", "cemetery"],
                            ["潜水艦", "submarine"],
                            ["宇宙ステーション", "space station"]
                        ],
                        "イベント": [
                            ["カクテルパーティ", "cocktail party"],
                            ["ガラパーティ", "gala event"],
                            ["ナイトクラブ", "night club"]
                        ],
                        "ファンタジー": [
                            ["ファンタジー世界", "fantasy world"],
                            ["城", "castle"],
                            ["古代遺跡", "ancient ruins"],
                            ["神殿", "temple of gods"],
                            ["魔法の森", "enchanted forest"],
                            ["クリスタル洞窟", "crystal cave"],
                            ["浮遊島", "floating islands"],
                            ["天空の都", "sky city"],
                            ["水中都市", "underwater city"],
                            ["ダンジョン", "dungeon"],
                            ["精霊の住処", "spirit's abode"],
                            ["妖精の庭", "fairy garden"],
                            ["巨人の住処", "giant's dwelling"],
                            ["龍の巣", "dragon's nest"],
                            ["魔法学校", "magic school"],
                            ["異世界の市場", "otherworldly market"],
                            ["魔導図書館", "arcane library"],
                            ["錬金術工房", "alchemy workshop"],
                            ["呪われた地", "cursed land"],
                            ["聖なる泉", "holy spring"],
                            ["伝説の鉱山", "legendary mine"],
                            ["異次元空間", "otherworldly dimension"]
                        ]
                    },
                    "時間帯": [
                        ["朝", "morning"],
                        ["昼", "daytime"],
                        ["夕方", "evening"],
                        ["夜", "night"],
                        ["深夜", "late night"]
                    ],
                    "天気": [
                        ["晴れ", "sunny"],
                        ["曇り", "cloudy"],
                        ["雨", "rainy"],
                        ["雪", "snowy"],
                        ["霧", "foggy"],
                        ["雷雨", "thunderstorm"],
                        ["オーロラ", "aurora"],
                        ["魔法の嵐", "magical storm"]
                    ]
                },
                "時代設定": [
                    ["古代", "ancient"],
                    ["中世", "medieval"],
                    ["近世", "early modern"],
                    ["現代", "modern"],
                    ["未来", "futuristic"],
                    ["ファンタジー", "fantasy"]
                ],
                "光源": [
                    ["自然光", "natural light"],
                    ["蛍光灯", "fluorescent light"],
                    ["スポットライト", "spotlight"],
                    ["キャンドル", "candle light"],
                    ["炎", "fire light"],
                    ["月光", "moonlight"],
                    ["星明かり", "starlight"],
                    ["魔法の光", "magical light"],
                    ["ドラマチックな照明", "dramatic lighting"],
                    ["スタジオ照明", "studio lighting"],
                    ["カラフルなライト", "colorful lights"]
                ],
                "画角": [
                    ["全身", "full shot"],
                    ["上半身", "medium shot"],
                    ["バストアップ", "bust shot"],
                    ["顔のアップ", "close-up shot"],
                    ["クローズアップ", "extreme close-up shot"],
                    ["アクションショット", "action shot"]
                ],
                "構図": {
                    "基本的な構図": [
                        ["中心", "centered"],
                        ["三分割", "rule of thirds"],
                        ["対角線", "diagonal composition"]
                    ],
                    "透視図法": [
                        ["一点透視", "one point perspective"],
                        ["二点透視", "two point perspective"]
                    ],
                    "遠近感": [
                        ["ぼかし", "bokeh"]
                    ],
                    "装飾的な構図": [
                        ["額縁構図", "frame in frame"],
                        ["トンネル構図", "tunnel composition"]
                    ],
                    "視点": [
                        ["鳥瞰図", "bird's eye view"],
                        ["ローアングル", "low angle"]
                    ]
                }
            },
            "人物概要": {
                "性別": [
                    ["男性", "man"],
                    ["女性", "woman"],
                    ["少年", "boy"],
                    ["少女", "girl"]
                ],
                "年齢": [
                    ["子供", "child"],
                    ["10代", "teenager"],
                    ["20代", "young adult"],
                    ["30代", "adult"],
                    ["40代", "middle-aged"],
                    ["50代以上", "elderly"]
                ],
                "人種": [
                    ["日本人", "japanese"],
                    ["中国人", "chinese"],
                    ["韓国人", "korean"],
                    ["アジア系", "asian"],
                    ["イギリス人", "british"],
                    ["フランス人", "french"],
                    ["ドイツ人", "german"],
                    ["イタリア人", "italian"],
                    ["スペイン人", "spanish"],
                    ["ロシア人", "russian"],
                    ["白人系", "caucasian"],
                    ["アフリカ系", "african"],
                    ["ラテン系", "latino"],
                    ["インド系", "indian"],
                    ["中東系", "middle eastern"],
                    ["ブラジル人", "brazilian"],
                    ["カナダ人", "canadian"],
                    ["ギリシャ人", "greek"],
                    ["エジプト人", "egyptian"],
                    ["ケニア人", "kenyan"]
                ],
                "属性": {
                    "職業": [
                        ["ビジネスマン", "businessman"],
                        ["ビジネスウーマン", "businesswoman"],
                        ["教師", "teacher"],
                        ["医者", "doctor"],
                        ["看護師", "nurse"],
                        ["警察官", "police officer"],
                        ["消防士", "firefighter"],
                        ["シェフ", "chef"],
                        ["パティシエ", "pastry chef"],
                        ["料理人", "cook"],
                        ["アーティスト", "artist"],
                        ["エンジニア", "engineer"],
                        ["農家", "farmer"],
                        ["漁師", "fisherman"],
                        ["職人", "craftsman"],
                        ["メイド", "maid"],
                        ["執事", "butler"],
                        ["男子学生", "school boy"],
                        ["女子学生", "school girl"],
                        ["チアリーダー", "cheerleader"],
                        ["アスリート", "athlete"],
                        ["陸上部員", "track and field athlete"],
                        ["アイドル", "idol"]
                    ],
                    "ファンタジー": [
                        ["冒険家", "adventurer"],
                        ["騎士", "knight"],
                        ["魔法使い", "wizard"],
                        ["魔女", "witch"],
                        ["エルフ", "elf"],
                        ["ドワーフ", "dwarf"],
                        ["獣人", "furry"],
                        ["吟遊詩人", "bard"],
                        ["僧侶", "priest"],
                        ["盗賊", "thief"],
                        ["暗殺者", "assassin"],
                        ["召喚士", "summoner"],
                        ["錬金術師", "alchemist"],
                        ["預言者", "seer"],
                        ["シャーマン", "shaman"],
                        ["精霊使い", "spirit master"],
                        ["ドラゴン", "dragon"],
                        ["グリフォン", "griffon"],
                        ["ユニコーン", "unicorn"],
                        ["フェニックス", "phoenix"]
                    ],
                    "人造/異形": [
                        ["アンドロイド", "android"],
                        ["サイボーグ", "cyborg"],
                        ["天使", "angel"],
                        ["悪魔", "demon"],
                        ["堕天使", "fallen angel"],
                        ["神", "god"],
                        ["妖精", "fairy"],
                        ["幽霊", "ghost"],
                        ["ゾンビ", "zombie"],
                        ["吸血鬼", "vampire"],
                        ["宇宙人", "alien"],
                        ["超能力者", "psychic"],
                        ["ゴーレム", "golem"],
                        ["精霊", "spirit"],
                        ["半人半獣", "centaur"]
                    ]
                },
                "雰囲気/ムード": [
                    ["落ち着いた", "calm"],
                    ["神秘的", "mysterious"],
                    ["幽玄な", "ethereal"],
                    ["夢のような", "dreamlike"],
                    ["気まぐれな", "whimsical"],
                    ["おとぎ話のような", "fairytale"],
                    ["シュールな", "surreal"],
                    ["ロマンチック", "romantic"],
                    ["魅惑的な", "alluring"],
                    ["エロティック", "erotic"],
                    ["官能的な", "sensual"],
                    ["色っぽい", "come-hither"],
                    ["魅惑的な", "seductive"],
                    ["挑発的な", "provocative"],
                    ["壮大な", "epic"],
                    ["壮麗な", "magnificent"],
                    ["活気のある", "energetic"],
                    ["楽しい", "happy"],
                    ["悲しい", "sad"],
                    ["怖い", "scary"],
                    ["不気味な", "eerie"],
                    ["威圧的な", "imposing"],
                    ["決意に満ちた", "determined"]
                ]
            },
            "外見的特徴": {
                "外見": [
                    ["角", "horns"],
                    ["翼", "wings"],
                    ["尻尾", "tail"],
                    ["鱗", "scales"],
                    ["獣の耳", "animal ears"],
                    ["尖った耳", "pointed ears"],
                    ["エルフの耳", "elf ears"],
                    ["触角", "antennae"],
                    ["羽根", "feathers"],
                    ["光輪", "halo"],
                    ["魔法のオーラ", "magical aura"],
                    ["宝石の装飾", "jewel decoration"]
                ],
                "体型": [
                    ["細身", "slender"],
                    ["華奢", "delicate build"],
                    ["小柄", "petite"],
                    ["ウエストが細い", "narrow waist"],
                    ["足が長い", "long legs"],
                    ["曲線美", "curvy figure"],
                    ["くびれのある体型", "hourglass figure"],
                    ["ボンキュッボン", "curvaceous figure"],
                    ["筋肉隆々", "heavily muscled"],
                    ["引き締まった筋肉", "toned muscles"],
                    ["細マッチョ", "lean muscled"],
                    ["アスリート体型", "athletic build"],
                    ["がっしりとした", "stocky build"],
                    ["大柄", "large build"],
                    ["ぽっちゃり", "plump"],
                    ["グラマー", "glamorous"],
                    ["豊満", "voluptuous"],
                    ["巨体", "giant build"],
                    ["妖精のような体型", "fairy-like figure"]
                ],
                "肌の色": [
                    ["薄い色の肌", "pale skin"],
                    ["明るい色の肌", "light skin"],
                    ["アイボリー色の肌", "ivory skin"],
                    ["ベージュ色の肌", "beige skin"],
                    ["ピンクがかった肌", "pinkish skin"],
                    ["黄色がかった肌", "yellowish skin"],
                    ["赤みがかった色の肌", "reddish skin"],
                    ["オリーブ色の肌", "olive skin"],
                    ["小麦色の肌", "tan skin"],
                    ["キャラメル色の肌", "caramel skin"],
                    ["濃い色の肌", "dark skin"],
                    ["深い色の肌", "deep skin"],
                    ["青みがかった色の肌", "bluish skin"],
                    ["緑色の肌", "green skin"],
                    ["紫色の肌", "purple skin"],
                    ["白人系の肌", "caucasian skin"],
                    ["アジア系の肌", "asian skin"],
                    ["アフリカ系の肌", "african skin"],
                    ["ラテン系の肌", "latino skin"],
                    ["先住民の肌", "indigenous skin"],
                    ["宝石のような肌", "jewel-like skin"],
                    ["金属のような肌", "metallic skin"]
                ],
                "顔の特徴": {
                    "目": [
                        ["黒い目", "black eyes"],
                        ["茶色い目", "brown eyes"],
                        ["青い目", "blue eyes"],
                        ["緑の目", "green eyes"],
                        ["ヘーゼルアイ", "hazel eyes"],
                        ["琥珀色の目", "amber eyes"],
                        ["灰色の目", "gray eyes"],
                        ["紫色の目", "purple eyes"],
                        ["ターコイズアイ", "turquoise eyes"],
                        ["オッドアイ", "heterochromia eyes"],
                        ["大きい目", "large eyes"],
                        ["小さい目", "small eyes"],
                        ["つり目", "almond eyes"],
                        ["たれ目", "droopy eyes"],
                        ["奥二重", "hooded eyes"],
                        ["色っぽい目つき", "seductive eyes"],
                        ["輝く目", "glowing eyes"],
                        ["宝石のような目", "jewel-like eyes"],
                        ["爬虫類のような目", "reptilian eyes"]
                    ],
                    "鼻": [
                        ["高い鼻", "high nose"],
                        ["低い鼻", "low nose"],
                        ["小さい鼻", "small nose"],
                        ["大きい鼻", "large nose"],
                        ["丸い鼻", "round nose"],
                        ["尖った鼻", "pointed nose"]
                    ],
                    "口": [
                        ["小さい口", "small mouth"],
                        ["大きい口", "large mouth"],
                        ["薄い唇", "thin lips"],
                        ["厚い唇", "full lips"],
                        ["少し開いた口元", "slightly parted lips"],
                        ["への字口", "down turned mouth"]
                    ],
                    "輪郭": [
                        ["ふっくらとした頬", "chubby cheeks"],
                        ["顎がシャープ", "sharp jawline"],
                        ["女性的な顔つき", "feminine face"],
                        ["男性的な顔つき", "masculine face"],
                        ["精霊のような顔つき", "ethereal face"],
                        ["悪魔のような顔つき", "demonic face"],
                        ["獣のような顔つき", "bestial face"]
                    ]
                },
                "ヘアスタイル": {
                    "長さ": [
                        ["ショート", "short hair"],
                        ["ミディアム", "medium hair"],
                        ["ロング", "long hair"],
                        ["腰まである長い髪", "waist-length hair"],
                        ["床まである長い髪", "floor-length hair"]
                    ],
                    "質感": [
                        ["サラサラヘア", "silky hair"],
                        ["ツヤツヤヘア", "shiny hair"],
                        ["ふわふわヘア", "fluffy hair"],
                        ["ボリュームのある髪", "voluminous hair"],
                        ["ボリュームのない髪", "flat hair"],
                        ["パサパサヘア", "dry hair"],
                        ["乱れた髪", "messy hair"],
                        ["整った髪", "neat hair"],
                        ["風になびく髪", "hair blowing in the wind"],
                        ["濡れた髪", "wet hair"],
                        ["汗ばんだ髪", "sweaty hair"],
                        ["オイルを塗ったような髪", "oiled hair"],
                        ["寝癖のついた髪", "bed hair"],
                        ["編み込まれた髪", "braided hair"],
                        ["燃えるような髪", "flaming hair"],
                        ["輝く髪", "glowing hair"],
                        ["氷のような髪", "icy hair"]
                    ],
                    "色": [
                        ["黒い髪", "black hair"],
                        ["茶色い髪", "brown hair"],
                        ["ブロンドヘア", "blonde hair"],
                        ["赤い髪", "red hair"],
                        ["アッシュヘア", "ash hair"],
                        ["グレーヘア", "gray hair"],
                        ["白い髪", "white hair"],
                        ["青い髪", "blue hair"],
                        ["緑の髪", "green hair"],
                        ["紫の髪", "purple hair"],
                        ["ピンクの髪", "pink hair"],
                        ["虹色の髪", "rainbow hair"],
                        ["金色の髪", "golden hair"],
                        ["銀色の髪", "silver hair"]
                    ],
                    "スタイル": [
                        ["ストレートヘア", "straight hair"],
                        ["ウェーブヘア", "wavy hair"],
                        ["カーリーヘア", "curly hair"],
                        ["かきあげヘア", "swept-back hair"],
                        ["ポニーテール", "ponytail"],
                        ["お団子", "bun hair"],
                        ["アフロヘア", "afro hair"],
                        ["ボブヘア", "bob hair"],
                        ["刈り上げ", "shaved hair"],
                        ["ドリルヘア", "drill hair"],
                        ["触覚のような髪", "antennae-like hair"]
                    ]
                },
                "胸": {
                    "大きさ": [
                        ["平坦な胸", "flat chest"],
                        ["控えめな胸", "modest bust"],
                        ["やや小さい胸", "slightly small bust"],
                        ["非常に小さい胸", "very small bust"],
                        ["やや大きい胸", "slightly large bust"],
                        ["大きい胸", "large bust"],
                        ["非常に大きい胸", "very large bust"]
                    ],
                    "形状": [
                        ["ハリのある胸", "firm bust"],
                        ["ボリュームのある胸", "voluminous bust"],
                        ["豊満な胸", "ample bust"],
                        ["ふっくらとした胸", "plump bust"],
                        ["丸みのある胸", "full bust"]
                    ],
                    "状態": [
                        ["谷間が見える胸", "cleavage"],
                        ["胸元が開いている", "chest area is open"],
                        ["胸が強調されている", "bust is emphasized"],
                        ["ブラジャーのラインが見える", "bra line visible"],
                        ["乳首が透けて見える", "nipples visible through clothing"],
                        ["アンダーバストが見える", "underboob visible"]
                    ]
                },
                "メガネ/サングラス": [
                    ["メガネ", "glasses"],
                    ["サングラス", "sunglasses"],
                    ["伊達メガネ", "fashion glasses"],
                    ["スクエア型", "square glasses"],
                    ["ラウンド型", "round glasses"],
                    ["キャットアイ型", "cat eye glasses"],
                    ["魔法の眼鏡", "magical glasses"]
                ],
                "メイク": [
                    ["ナチュラルメイク", "natural makeup"],
                    ["濃いメイク", "heavy makeup"],
                    ["赤リップ", "red lipstick"],
                    ["スモーキーアイ", "smoky eyes"],
                    ["キラキラとしたメイク", "glittery makeup"],
                    ["宝石のメイク", "jewel makeup"],
                    ["魔法のメイク", "magical makeup"]
                ],
                "タトゥー/傷跡": [
                    ["タトゥー", "tattoo"],
                    ["花", "flower tattoo"],
                    ["動物", "animal tattoo"],
                    ["幾何学模様", "geometric tattoo"],
                    ["文字", "letter tattoo"],
                    ["傷跡", "scar"],
                    ["顔の傷", "face scar"],
                    ["体の傷", "body scar"],
                    ["切り傷", "cut scar"],
                    ["火傷の跡", "burn scar"],
                    ["魔法の紋様", "magical markings"],
                    ["精霊の印", "spirit mark"]
                ]
            },
            "姿勢と動作": {
                "ポーズ": {
                    "基本的な立ちポーズ": [
                        ["直立不動", "standing straight"],
                        ["リラックスした立ち姿", "relaxed standing pose"],
                        ["片足重心の立ち姿", "standing with weight on one leg"],
                        ["足を少し開いて立つ", "standing with feet slightly apart"],
                        ["足を閉じて立つ", "standing with feet together"],
                        ["腰に手を当てて立つ", "standing with hands on hips"],
                        ["腕を組んで立つ", "standing with arms crossed"],
                        ["壁に寄りかかって立つ", "standing leaning against the wall"],
                        ["料理をしている", "cooking"]
                    ],
                    "基本的な座りポーズ": [
                        ["椅子に座る", "sitting on a chair"],
                        ["床に座る", "sitting on the floor"],
                        ["足を組んで座る", "sitting with legs crossed"],
                        ["足を伸ばして座る", "sitting with legs extended"],
                        ["膝を抱えて座る", "sitting with knees hugged"],
                        ["あぐらをかいて座る", "sitting cross-legged"],
                        ["正座する", "sitting in seiza"],
                        ["ソファに座る", "sitting on a sofa"],
                        ["階段に座る", "sitting on stairs"],
                        ["縁に腰掛ける", "sitting on an edge"]
                    ],
                    "動きのあるポーズ": [
                        ["歩く", "walking"],
                        ["走る", "running"],
                        ["トラックを走る", "running on the track"],
                        ["ジャンプする", "jumping"],
                        ["飛び跳ねる", "skipping"],
                        ["回転する", "spinning"],
                        ["踊る", "dancing"],
                        ["応援する", "cheering"],
                        ["ダンス", "dance routine"],
                        ["アクロバット", "acrobatics"],
                        ["振り返る", "looking back"],
                        ["手を振る", "waving hand"],
                        ["何かを指さす", "pointing at something"],
                        ["手を伸ばす", "reaching out"],
                        ["腕を回す", "swinging arms"],
                        ["しゃがむ", "squatting"],
                        ["かがむ", "bending over"],
                        ["ヨガをする", "doing yoga"],
                        ["瞑想する", "meditating"],
                        ["ストレッチをする", "stretching"],
                        ["準備運動をする", "stretching exercises"],
                        ["ウォーミングアップ", "warming up"],
                        ["プールサイドに座る", "sitting by the poolside"],
                        ["プールサイドに立つ", "standing by the poolside"],
                        ["プールから上がる", "getting out of the pool"],
                        ["プールに飛び込む", "jumping into the pool"],
                        ["クールダウン", "cooling down"],
                        ["スタートダッシュ", "starting dash"],
                        ["ハードルを跳ぶ", "jumping hurdles"],
                        ["バトンを受け取る", "receiving baton"],
                        ["バトンを渡す", "handing off baton"],
                        ["お辞儀をする", "bowing"],
                        ["お給仕する", "serving"],
                        ["膝まずく", "kneeling"],
                        ["敬礼する", "saluting"],
                        ["魔法を詠唱する", "casting a spell"]
                    ],
                    "感情や状態を表すポーズ": [
                        ["考えるポーズ", "thinking pose"],
                        ["驚いたポーズ", "surprised pose"],
                        ["怒っているポーズ", "angry pose"],
                        ["悲しんでいるポーズ", "sad pose"],
                        ["喜んでいるポーズ", "happy pose"],
                        ["疲れたポーズ", "tired pose"],
                        ["リラックスしているポーズ", "relaxed pose"],
                        ["悩んでいるポーズ", "worried pose"],
                        ["恥ずかしがっているポーズ", "embarrassed pose"],
                        ["挑発的なポーズ", "provocative pose"],
                        ["自信に満ちたポーズ", "confident pose"],
                        ["警戒しているポーズ", "cautious pose"],
                        ["落ち着いているポーズ", "calm pose"],
                        ["胸を強調するポーズ", "bust-enhancing pose"],
                        ["胸を寄せるポーズ", "bust-boosting pose"],
                        ["服をずり下げる", "pulling down clothing"],
                        ["服をまくり上げる", "lifting up clothing"],
                        ["胸を隠す仕草", "gesture of hiding breasts"],
                        ["恥じらう仕草", "gesture of feeling embarrassed"],
                        ["腕を組んで考える", "thinking with arms crossed"],
                        ["頭を抱えて悩む", "worrying with hands on head"],
                        ["天を仰いで嘆く", "lamenting while looking up at the sky"],
                        ["地面を指さして説明する", "explaining while pointing to the ground"],
                        ["身振り手振りで熱弁する", "speaking passionately with gestures"],
                        ["顔を赤らめて照れる", "blushing with embarrassment"],
                        ["両手を広げて歓迎する", "welcoming with open arms"],
                        ["肩をすくめて諦める", "shrugging with resignation"],
                        ["指をさして笑う", "laughing while pointing"],
                        ["頬杖をついて退屈する", "being bored while resting cheek on hand"],
                        ["目を閉じて瞑想する", "meditating with eyes closed"],
                        ["口元に手を当てて内緒話をする", "whispering with hand to mouth"],
                        ["首を横に振って否定する", "negating with a shake of the head"],
                        ["頷いて同意する", "agreeing with a nod"],
                        ["人差し指を立てて注意を促す", "raising a forefinger to draw attention"],
                        ["肩を落としてがっかりする", "being disappointed with slumped shoulders"],
                        ["唇を噛んで我慢する", "enduring with a biting lip"],
                        ["顔を覆って泣く", "crying with face covered"],
                        ["拳を握りしめて決意する", "resolving with clenched fists"],
                        ["胸に手を当てて誓う", "swearing with hand on chest"],
                        ["親指を立てて賛同する", "approving with a thumbs up"],
                        ["親指を下に向けて反対する", "disapproving with a thumbs down"],
                        ["手のひらを広げて懇願する", "pleading with open palms"],
                        ["目をそらして罪悪感を感じる", "feeling guilty while averting eyes"],
                        ["冷たい視線を送る", "giving a cold glare"],
                        ["そっと微笑む", "smiling gently"],
                        ["嘲笑う", "sneering"],
                        ["白目をむく", "rolling eyes"],
                        ["ため息をつく", "sighing"],
                        ["腕を組んで見下す", "looking down with arms crossed"],
                        ["指を組んで待つ", "waiting with fingers crossed"],
                        ["顎に手を当てて思案する", "pondering with hand on chin"],
                        ["祈るように手を合わせる", "joining hands in prayer"],
                        ["ひざまずいて懇願する", "kneeling and pleading"]
                    ],
                    "その他のポーズ": [
                        ["片手を上げる", "raising one hand"],
                        ["両手を上げる", "raising both hands"],
                        ["頭を抱える", "holding head"],
                        ["胸に手を当てる", "hand on chest"],
                        ["頬に手を当てる", "hand on cheek"],
                        ["祈るポーズ", "praying pose"],
                        ["腰をかがめる", "bending at the waist"],
                        ["後ろを向く", "facing away"],
                        ["横を向く", "facing sideways"],
                        ["うつ伏せになる", "lying on stomach"],
                        ["仰向けになる", "lying on back"],
                        ["壁にもたれかかる", "leaning against a wall"],
                        ["座って本を読む", "sitting and reading a book"],
                        ["手を繋ぐ", "holding hands"],
                        ["ハグをする", "hugging"],
                        ["キスをする", "kissing"],
                        ["戦うポーズ", "fighting pose"],
                        ["武器を構える", "wielding a weapon"],
                        ["物を持ち上げる", "lifting an object"],
                        ["物を運ぶ", "carrying an object"],
                        ["魔法を放つポーズ", "casting magic pose"],
                        ["召喚のポーズ", "summoning pose"],
                        ["祝福するポーズ", "blessing pose"],
                        ["瞑想するポーズ", "meditating pose"]
                    ]
                },
                "表情": [
                    ["真顔", "neutral face"],
                    ["笑顔", "smiling"],
                    ["妖艶な微笑み", "seductive smile"],
                    ["アンニュイな表情", "ennui expression"],
                    ["喜び", "joyful"],
                    ["怒り", "angry"],
                    ["驚き", "surprised"],
                    ["不安", "anxious"],
                    ["悩み", "worried"],
                    ["挑発的な視線", "provocative gaze"],
                    ["恍惚の表情", "ecstatic expression"],
                    ["恐怖の表情", "fearful expression"],
                    ["軽蔑の表情", "contemptuous expression"],
                    ["無表情", "expressionless"],
                    ["慈愛に満ちた表情", "loving expression"]
                ],
                "姿勢": [
                    ["直立", "upright"],
                    ["リラックス", "relaxed"],
                    ["猫背", "slouching"],
                    ["前かがみ", "leaning forward"],
                    ["反り返る", "leaning backward"],
                    ["優雅な姿勢", "graceful posture"],
                    ["威圧的な姿勢", "imposing posture"],
                    ["警戒した姿勢", "alert posture"],
                    ["隠れた姿勢", "hidden posture"]
                ],
                "視線": {
                    "基本的な視線": [
                        ["正面を見る", "looking at the camera"],
                        ["左を見る", "looking to the left"],
                        ["右を見る", "looking to the right"],
                        ["上を見る", "looking up"],
                        ["下を見る", "looking down"],
                        ["斜め上を見る", "looking up to the side"],
                        ["斜め下を見る", "looking down to the side"],
                        ["遠くを見る", "looking into the distance"],
                        ["近くを見る", "looking at something nearby"],
                        ["何かを見つめる", "staring at something"]
                    ],
                    "感情を伴う視線": [
                        ["優しい眼差し", "gentle gaze"],
                        ["鋭い眼差し", "sharp gaze"],
                        ["悲しげな眼差し", "sad gaze"],
                        ["怒りの眼差し", "angry gaze"],
                        ["誘うような視線", "inviting gaze"],
                        ["喜びに満ちた眼差し", "joyful gaze"],
                        ["驚いた眼差し", "surprised gaze"],
                        ["不安そうな眼差し", "anxious gaze"],
                        ["好奇心に満ちた眼差し", "curious gaze"],
                        ["疑いの眼差し", "suspicious gaze"],
                        ["冷たい眼差し", "cold gaze"],
                        ["魅惑的な眼差し", "alluring gaze"],
                        ["見下す眼差し", "looking down on"],
                        ["見上げる眼差し", "looking up at"],
                        ["無関心な眼差し", "indifferent gaze"],
                        ["恥ずかしそうな眼差し", "bashful gaze"],
                        ["思慮深い眼差し", "thoughtful gaze"],
                        ["瞑想的な眼差し", "meditative gaze"],
                        ["夢見るような眼差し", "dreamy gaze"],
                        ["軽蔑的な眼差し", "contemptuous gaze"]
                    ],
                    "特定の対象物を見る視線": [
                        ["カメラを直視する", "looking directly at the camera"],
                        ["観客を見る", "looking at the audience"],
                        ["誰かを見る", "looking at someone"],
                        ["何かを探すように見る", "looking around"],
                        ["画面を見つめる", "looking at the screen"],
                        ["本を見つめる", "looking at the book"],
                        ["空を見上げる", "looking up at the sky"],
                        ["地面を見る", "looking down at the ground"],
                        ["鏡を見る", "looking at a mirror"],
                        ["魔法のアイテムを見つめる", "looking at a magical item"],
                        ["星空を見上げる", "looking at the starry sky"],
                        ["精霊を見る", "looking at a spirit"]
                    ],
                    "視線の状態": [
                        ["焦点が合っていない視線", "unfocused gaze"],
                        ["潤んだ瞳", "watery eyes"],
                        ["焦点の合った視線", "focused gaze"],
                        ["目を細めて見る", "squinting eyes"],
                        ["見開いた目", "wide-eyed"],
                        ["目をそらす", "averting eyes"],
                        ["伏し目がち", "downcast eyes"],
                        ["視線を合わせない", "avoiding eye contact"],
                        ["視線を交わす", "making eye contact"],
                        ["睨みつける", "glaring"],
                        ["催眠術のような視線", "hypnotic gaze"],
                        ["虚ろな視線", "hollow gaze"]
                    ]
                }
            },
            "服装と装飾品": {
                "服装": {
                    "全体": {
                        "基本的な服装": [
                            ["カジュアル", "casual clothing"],
                            ["スポーティ", "sporty clothing"],
                            ["ストリート", "street fashion"],
                            ["フォーマル", "formal clothing"],
                            ["露出度の高い服", "revealing clothes"],
                            ["セクシー", "sexy clothing"],
                            ["体にフィットした服", "body-hugging clothes"],
                            ["ランジェリー風", "lingerie-like clothing"]
                        ],
                        "部屋着": [
                            ["ローブ", "robe"],
                            ["パジャマ", "pajamas"],
                            ["ルームウェア", "room wear"]
                        ],
                        "服の柄": [
                            ["無地の服", "plain clothing"],
                            ["ストライプ柄の服", "striped clothing"],
                            ["ドット柄の服", "dotted clothing"],
                            ["チェック柄の服", "checkered clothing"],
                            ["水玉模様の服", "polka dot clothing"],
                            ["花柄の服", "floral clothing"],
                            ["幾何学模様の服", "geometric pattern clothing"],
                            ["アニマル柄の服", "animal print clothing"],
                            ["ペイズリー柄の服", "paisley pattern clothing"],
                            ["迷彩柄の服", "camouflage pattern clothing"],
                            ["グラデーションの服", "gradient clothing"],
                            ["抽象的な模様の服", "abstract pattern clothing"],
                            ["民族衣装の柄", "ethnic pattern clothing"]
                        ],
                        "特定のスタイル": [
                            ["ゴシック", "gothic clothing"],
                            ["和風", "japanese clothing"],
                            ["ファンタジー", "fantasy clothing"],
                            ["パンク", "punk clothing"],
                            ["サイバーパンク", "cyberpunk clothing"],
                            ["ロリータ", "lolita fashion"],
                            ["ボヘミアン", "bohemian fashion"],
                            ["スチームパンク", "steampunk fashion"],
                            ["ウェディング", "wedding dress"]
                        ],
                        "制服": [
                            ["制服", "uniform"],
                            ["学生服", "school uniform"],
                            ["チアリーダーのユニフォーム", "cheerleader uniform"],
                            ["医者の白衣", "doctor's coat"],
                            ["看護師の制服", "nurse uniform"],
                            ["警察官の制服", "police uniform"],
                            ["消防士の制服", "firefighter uniform"],
                            ["ミリタリー", "military clothing"],
                            ["パイロットの制服", "pilot uniform"],
                            ["シェフの制服", "chef uniform"],
                            ["クラシックメイド服", "classic maid uniform"],
                            ["フレンチメイド服", "french maid uniform"],
                            ["ゴスロリメイド服", "gothic lolita maid uniform"],
                            ["チャイナメイド服", "china maid uniform"]
                        ],
                        "水着": [
                            ["水着", "swimsuit"],
                            ["ビキニ", "bikini"],
                            ["ハイレグビキニ", "high-leg bikini"],
                            ["マイクロビキニ", "micro bikini"],
                            ["ストリングビキニ", "string bikini"],
                            ["バンドゥビキニ", "bandeau bikini"],
                            ["トライアングルビキニ", "triangle bikini"],
                            ["ワンピース水着", "one-piece swimsuit"],
                            ["モノキニ", "monokini"],
                            ["スクール水着", "school swimsuit"],
                            ["ハイネック水着", "high-neck swimsuit"],
                            ["カットアウト水着", "cutout swimsuit"],
                            ["バックレス水着", "backless swimsuit"],
                            ["タンキニ", "tankini"],
                            ["ラッシュガード", "rash guard"],
                            ["競泳水着", "competition swimsuit"],
                            ["フィットネス水着", "fitness swimsuit"],
                            ["ビキニアーマー", "bikini armor"],
                            ["貝殻のブラ", "shell bra"],
                            ["露出度の高い水着", "revealing swimsuit"],
                            ["露出度の低い水着", "modest swimsuit"]
                        ],
                        "服の様子": [
                            ["少しはだけた", "slightly open clothing"],
                            ["胸元がはだけた", "chest area is slightly open"],
                            ["肩が露出した", "shoulder is exposed"],
                            ["服がずり落ちそう", "clothing is slipping off"],
                            ["服が大きく開いている", "clothing is widely open"],
                            ["服が乱れている", "disheveled clothing"],
                            ["ボタンが外れたシャツ", "unbuttoned shirt"],
                            ["ジッパーが開いたジャケット", "unzipped jacket"],
                            ["肩から服が落ちかけている", "clothing slipping off the shoulder"],
                            ["スカートが少しずり下がった", "skirt slightly slipped down"],
                            ["着崩したシャツ", "loosely worn shirt"],
                            ["服の襟元が開いている", "open neckline"],
                            ["胸元が開いた服", "open-chested clothing"],
                            ["風で服がめくれ上がった", "clothing is blown up by the wind"],
                            ["動きで服が乱れた", "clothing is disheveled by movement"],
                            ["激しい動きで服がはだけた", "clothing is opened by intense movement"],
                            ["アクティブなポーズで服がはだけた", "clothing is opened by an active pose"],
                            ["ダンスで服が乱れてはだけた", "clothing is disheveled and opened by dance"],
                            ["喧嘩で服がはだけた", "clothing is opened in a fight"],
                            ["衣服が一部破れている", "partially torn clothing"],
                            ["シャツのボタンがいくつか外れている", "some shirt buttons are undone"],
                            ["濡れたTシャツ", "wet t-shirt"],
                            ["服が体に張り付いている", "clothing clinging to body"],
                            ["ボタンが外れて胸が見えそう", "unbuttoned shirt revealing cleavage"],
                            ["胸の形がはっきりとわかる服", "clothing clearly showing bust shape"],
                            ["服が体に密着している", "clothes are clinging to the body"],
                            ["胸の形が強調されている", "chest shape is emphasized"],
                            ["ブラ紐が見えている", "bra strap is visible"],
                            ["スカートがめくれ上がっている", "skirt is flipped up"],
                            ["太ももが露わになっている", "thighs are exposed"],
                            ["胸元が大きく開いている", "cleavage is deeply visible"],
                            ["服が濡れて透けている", "clothes are wet and see-through"]
                        ]
                    },
                    "トップス": [
                        ["トップスなし", "no top"],
                        ["Tシャツ", "t-shirt"],
                        ["シャツ", "shirt"],
                        ["ポロシャツ", "polo shirt"],
                        ["ブラウス", "blouse"],
                        ["タンクトップ", "tank top"],
                        ["キャミソール", "camisole"],
                        ["チューブトップ", "tube top"],
                        ["ホルターネック", "halter neck top"],
                        ["オフショルダー", "off-shoulder top"],
                        ["クロップドトップ", "cropped top"],
                        ["ボディスーツ", "bodysuit"],
                        ["タートルネック", "turtleneck"],
                        ["ニット", "knit sweater"],
                        ["パーカー", "hoodie"],
                        ["カーディガン", "cardigan"],
                        ["スウェット", "sweatshirt"],
                        ["ブレザー", "blazer"],
                        ["ジャケット", "jacket"],
                        ["コート", "coat"],
                        ["ベスト", "vest"],
                        ["ボレロ", "bolero"],
                        ["チュニック", "tunic"],
                        ["レーストップス", "lace top"],
                        ["メッシュトップス", "mesh top"],
                        ["フリルブラウス", "frilled blouse"],
                        ["パフスリーブブラウス", "puff sleeve blouse"],
                        ["シースルー", "see-through top"],
                        ["キャミソールワンピース", "camisole dress"],
                        ["オーバーサイズシャツ", "oversized shirt"],
                        ["ノースリーブシャツ", "sleeveless shirt"],
                        ["ロングスリーブシャツ", "long sleeve shirt"],
                        ["ハーフスリーブシャツ", "half sleeve shirt"],
                        ["ボタンダウンシャツ", "button-down shirt"],
                        ["ドレス", "dress"],
                        ["着物", "kimono"],
                        ["鎧", "armor"],
                        ["体操服", "gym uniform top"],
                        ["ジム用タンクトップ", "gym tank top"],
                        ["タイトシャツ", "tight shirt"],
                        ["ローカットドレス", "low-cut dress"],
                        ["胸を強調するトップス", "bust-enhancing top"]
                    ],
                    "ボトムス": [
                        ["ボトムスなし", "no bottoms"],
                        ["ジーンズ", "jeans"],
                        ["パンツ", "pants"],
                        ["スキニーパンツ", "skinny pants"],
                        ["ワイドパンツ", "wide pants"],
                        ["ショートパンツ", "shorts"],
                        ["ホットパンツ", "hot pants"],
                        ["ショート丈のパンツ", "short shorts"],
                        ["スカート", "skirt"],
                        ["ミニスカート", "mini skirt"],
                        ["フレアスカート", "flare skirt"],
                        ["プリーツスカート", "pleated skirt"],
                        ["タイトスカート", "tight skirt"],
                        ["ロングスカート", "long skirt"],
                        ["ミディスカート", "midi skirt"],
                        ["Aラインスカート", "A-line skirt"],
                        ["デニムスカート", "denim skirt"],
                        ["レギンス", "leggings"],
                        ["カーゴパンツ", "cargo pants"],
                        ["チノパンツ", "chino pants"],
                        ["スラックス", "slacks"],
                        ["ガウチョパンツ", "gaucho pants"],
                        ["ジョガーパンツ", "jogger pants"],
                        ["サルエルパンツ", "sarouel pants"],
                        ["レザーパンツ", "leather pants"],
                        ["ベルボトム", "bell bottoms"],
                        ["バギーパンツ", "baggy pants"],
                        ["キュロット", "culottes"],
                        ["サロペット", "overall"],
                        ["ジャージ", "jersey pants"],
                        ["スウェットパンツ", "sweatpants"],
                        ["袴", "hakama"],
                        ["ジム用ショートパンツ", "gym shorts"],
                        ["ブルマ", "bloomers"]
                    ],
                    "靴": [
                        ["スニーカー", "sneakers"],
                        ["革靴", "leather shoes"],
                        ["ブーツ", "boots"],
                        ["サンダル", "sandals"],
                        ["ハイヒール", "high heels"],
                        ["魔法の靴", "magical shoes"]
                    ],
                    "下着": {
                        "基本的な下着": [
                            ["下着なし", "no panties"],
                            ["ブラジャー", "bra"],
                            ["ショーツ", "panties"],
                            ["スポーツブラ", "sports bra"]
                        ],
                        "ランジェリー": [
                            ["ランジェリー", "lingerie"],
                            ["キャミソール", "camisole"],
                            ["スリップ", "slip"],
                            ["ベビードール", "babydoll"],
                            ["テディ", "teddy"],
                            ["コルセット", "corset"],
                            ["ビスチェ", "bustier"]
                        ],
                        "レッグウェア": [
                            ["ストッキング", "stockings"],
                            ["網タイツ", "fishnet stockings"],
                            ["タイツ", "tights"],
                            ["レッグウォーマー", "leg warmers"],
                            ["ハイソックス", "high socks"],
                            ["ニーソックス", "knee socks"],
                            ["ソックス", "socks"]
                        ],
                        "男性下着": [
                            ["ブリーフ", "briefs"],
                            ["ボクサーパンツ", "boxer shorts"]
                        ],
                        "特殊な下着": [
                            ["Tバック", "thong"],
                            ["Gストリング", "g-string"],
                            ["ヒップハンガー", "hipsters"],
                            ["ペチコート", "petticoat"],
                            ["ブラレット", "bralette"],
                            ["ノンワイヤーブラ", "non-wired bra"],
                            ["プランジブラ", "plunge bra"],
                            ["ハーフカップブラ", "half cup bra"],
                            ["フルカップブラ", "full cup bra"],
                            ["タンクトップブラ", "tank top bra"],
                            ["ワイヤレスブラ", "wireless bra"],
                            ["オープンブラ", "open bra"],
                            ["レースブラ", "lace bra"],
                            ["メッシュブラ", "mesh bra"],
                            ["シームレスショーツ", "seamless panties"],
                            ["レースショーツ", "lace panties"],
                            ["ハイウエストショーツ", "high-waist panties"],
                            ["ローライズショーツ", "low-rise panties"],
                            ["コットンショーツ", "cotton panties"],
                            ["シルクショーツ", "silk panties"],
                            ["レザーランジェリー", "leather lingerie"],
                            ["サテンランジェリー", "satin lingerie"],
                            ["シースルーランジェリー", "see-through lingerie"],
                            ["メッシュランジェリー", "mesh lingerie"],
                            ["リボン付きランジェリー", "ribbon lingerie"],
                            ["フリル付きランジェリー", "frilly lingerie"],
                            ["ボディストッキング", "bodystocking"],
                            ["シリコンブラ", "silicone bra"],
                            ["ヌーブラ", "nu bra"]
                        ],
                        "下着の状態": [
                            ["ブラジャーの肩紐が見える", "bra strap visible"],
                            ["ブラジャーのアンダーバンドが見える", "bra underband visible"],
                            ["ブラジャーが透けて見える", "bra visible through clothing"]
                        ]
                    }
                }
            },
            "小道具": {
                "基本的な小道具": [
                    ["ネックレス", "necklace"],
                    ["チョーカー", "choker"],
                    ["ペンダント", "pendant"],
                    ["ロケットペンダント", "locket pendant"],
                    ["イヤリング", "earrings"],
                    ["ピアス", "piercing"],
                    ["指輪", "ring"],
                    ["ブレスレット", "bracelet"],
                    ["バングル", "bangle"],
                    ["アンクレット", "anklet"],
                    ["ヘアピン", "hairpin"],
                    ["バレッタ", "barrette"],
                    ["カチューシャ", "headband"],
                    ["ヘアクリップ", "hair clip"],
                    ["帽子", "hat"],
                    ["キャップ", "cap"],
                    ["ベレー帽", "beret"],
                    ["ヘッドドレス", "headdress"],
                    ["ティアラ", "tiara"],
                    ["クラウン", "crown"],
                    ["腕時計", "watch"],
                    ["懐中時計", "pocket watch"],
                    ["スカーフ", "scarf"],
                    ["ストール", "stole"],
                    ["マフラー", "muffler"],
                    ["ベルト", "belt"],
                    ["ガーターベルト", "garter belt"],
                    ["ボディチェーン", "body chain"],
                    ["アームレット", "armlet"],
                    ["グローブ", "gloves"],
                    ["レースの手袋", "lace gloves"],
                    ["ショルダーバッグ", "shoulder bag"],
                    ["ハンドバッグ", "handbag"],
                    ["リュックサック", "backpack"],
                    ["ブローチ", "brooch"],
                    ["コサージュ", "corsage"],
                    ["扇子", "folding fan"],
                    ["傘", "umbrella"],
                    ["杖", "cane"],
                    ["お守り", "amulet"],
                    ["腕輪", "armband"],
                    ["本", "book"],
                    ["ノート", "notebook"],
                    ["ペン", "pen"],
                    ["鉛筆", "pencil"],
                    ["筆", "brush"],
                    ["絵の具", "paint"],
                    ["パレット", "palette"],
                    ["スマートフォン", "smartphone"],
                    ["タブレット", "tablet"],
                    ["コーヒーカップ", "coffee cup"],
                    ["ティーカップ", "tea cup"],
                    ["グラス", "glass"],
                    ["ワイングラス", "wine glass"],
                    ["お皿", "plate"],
                    ["フォーク", "fork"],
                    ["ナイフ", "knife"],
                    ["スプーン", "spoon"],
                    ["花", "flower"],
                    ["鍵", "key"],
                    ["手紙", "letter"],
                    ["地図", "map"],
                    ["カメラ", "camera"],
                    ["楽器", "instrument"],
                    ["ぬいぐるみ", "stuffed toy"],
                    ["扇風機", "fan"],
                    ["香水", "perfume"],
                    ["本を読んでいる", "reading a book"],
                    ["スマートフォンを操作している", "using a smartphone"],
                    ["タブレットを操作している", "using a tablet"],
                    ["ペンで書いている", "writing with a pen"],
                    ["鉛筆で書いている", "writing with a pencil"],
                    ["ノートに書いている", "writing in a notebook"],
                    ["筆で描いている", "painting with a brush"],
                    ["絵の具で描いている", "painting with paint"],
                    ["パレットを持っている", "holding a palette"],
                    ["コーヒーカップを持っている", "holding a coffee cup"],
                    ["ティーカップを持っている", "holding a tea cup"],
                    ["グラスを持っている", "holding a glass"],
                    ["ワイングラスを持っている", "holding a wine glass"],
                    ["お皿を持っている", "holding a plate"],
                    ["フォークを使っている", "using a fork"],
                    ["ナイフを使っている", "using a knife"],
                    ["スプーンを使っている", "using a spoon"],
                    ["花を持っている", "holding a flower"],
                    ["鍵を持っている", "holding a key"],
                    ["手紙を読んでいる", "reading a letter"],
                    ["地図を見ている", "looking at a map"],
                    ["カメラを構えている", "holding a camera"],
                    ["楽器を演奏している", "playing an instrument"],
                    ["ぬいぐるみを抱きしめている", "hugging a stuffed toy"],
                    ["スケッチブックに描いている", "drawing in a sketchbook"],
                    ["三脚を立てている", "setting up a tripod"],
                    ["地球儀を回している", "spinning a globe"],
                    ["懐中電灯を持っている", "holding a flashlight"],
                    ["望遠鏡を覗いている", "looking through a telescope"],
                    ["顕微鏡を覗いている", "looking through a microscope"],
                    ["ルーペで観察している", "observing with a magnifying glass"],
                    ["時計を見ている", "looking at a clock"],
                    ["カレンダーを見ている", "looking at a calendar"],
                    ["地球儀を見ている", "looking at a globe"],
                    ["風船を持っている", "holding a balloon"]
                ],
                "ファンタジーな小道具": [
                    ["魔法の杖", "magic wand"],
                    ["魔法の宝石", "magical jewel"],
                    ["剣", "sword"],
                    ["盾", "shield"],
                    ["弓", "bow"],
                    ["矢", "arrow"],
                    ["魔法の薬", "magic potion"],
                    ["巻物", "scroll"],
                    ["宝箱", "treasure chest"],
                    ["ランタン", "lantern"],
                    ["魔法の鏡", "magic mirror"],
                    ["水晶玉", "crystal ball"],
                    ["魔法の書", "spellbook"],
                    ["聖杯", "holy grail"],
                    ["錬金術の道具", "alchemy tools"],
                    ["魔法の武器", "magical weapon"],
                    ["聖剣", "holy sword"],
                    ["伝説の武器", "legendary weapon"],
                    ["魔法の杖を振る", "waving a magic wand"],
                    ["剣を構える", "wielding a sword"],
                    ["盾を構える", "wielding a shield"],
                    ["剣を振る", "swinging a sword"],
                    ["弓を引く", "drawing a bow"],
                    ["矢を放つ", "shooting an arrow"],
                    ["魔法の薬を飲んでいる", "drinking a magic potion"],
                    ["巻物を読んでいる", "reading a scroll"],
                    ["宝箱を開けている", "opening a treasure chest"],
                    ["ランタンを持っている", "holding a lantern"]
                ],
                "武器": [
                    ["銃", "gun"],
                    ["ナイフ", "knife"],
                    ["ハンマー", "hammer"],
                    ["斧", "axe"],
                    ["チェーンソー", "chainsaw"],
                    ["手榴弾", "grenade"],
                    ["ロケットランチャー", "rocket launcher"],
                    ["銃を構えている", "wielding a gun"],
                    ["ナイフを構えている", "wielding a knife"],
                    ["ハンマーを振りかぶっている", "wielding a hammer"],
                    ["斧を振りかぶっている", "wielding an axe"],
                    ["チェーンソーを構えている", "wielding a chainsaw"],
                    ["手榴弾を投げている", "throwing a grenade"],
                    ["ロケットランチャーを構えている", "wielding a rocket launcher"]
                ],
                "その他の小道具": [
                    ["スケッチブック", "sketchbook"],
                    ["三脚", "tripod"],
                    ["地球儀", "globe"],
                    ["懐中電灯", "flashlight"],
                    ["望遠鏡", "telescope"],
                    ["顕微鏡", "microscope"],
                    ["ルーペ", "magnifying glass"],
                    ["時計", "clock"],
                    ["カレンダー", "calendar"],
                    ["風船", "balloon"],
                    ["ポンポン", "pom-poms"],
                    ["飲み物", "drink"],
                    ["コーヒー", "coffee"],
                    ["お茶", "tea"],
                    ["ジュース", "juice"],
                    ["ソーダ", "soda"],
                    ["ワイン", "wine"],
                    ["デザート", "dessert"],
                    ["ケーキ", "cake"],
                    ["パイ", "pie"],
                    ["プリン", "pudding"],
                    ["クッキー", "cookie"],
                    ["ブラウニー", "brownie"],
                    ["アイスクリーム", "ice cream"],
                    ["日本料理", "Japanese cuisine"],
                    ["寿司", "sushi"],
                    ["ラーメン", "ramen"],
                    ["天ぷら", "tempura"],
                    ["刺身", "sashimi"],
                    ["焼き鳥", "yakitori"],
                    ["味噌汁", "miso soup"],
                    ["おにぎり", "onigiri"],
                    ["うどん", "udon"],
                    ["そば", "soba"]
                ]
            }
        };
    }
}
