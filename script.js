// HTML要素を取得
const promptSelector = document.getElementById('prompt-selector');
const selectedList = document.getElementById('selected-list');
const selectedPromptText = document.getElementById('selected-prompt-text');

// 選択されたプロンプトを格納する配列
let selectedPrompts = [];

/**
 * 選択肢のボタンを生成する関数
 * @param {string} text - プロンプトのテキスト（英語）
 * @param {string} japaneseText - プロンプトのテキスト（日本語）
 * @param {string} keys - カテゴリー
 * @returns {HTMLButtonElement} 生成されたボタン要素
 */
function createOptionButton(text, japaneseText, ...keys) {
    const button = document.createElement('button'); // ボタン要素を生成
    button.textContent = japaneseText; // ボタンのテキストを日本語で設定
    button.classList.add('option-button', 'btn-sm'); // Bootstrapのスタイルとクラスを追加
    button.dataset.category = keys.join("-")

    // ボタンがクリックされた時のイベントリスナーを設定
    button.addEventListener('click', () => handleOptionClick(text, japaneseText, button, ...keys));
    return button; // 生成したボタン要素を返す
}

/**
 * 選択肢のボタンがクリックされた時の処理を行う関数
 * @param {string} text - プロンプトのテキスト（英語）
 * @param {string} japaneseText - プロンプトのテキスト（日本語）
 * @param {HTMLButtonElement} button - クリックされたボタン要素
 * @param {string} keys - カテゴリー名
 */
function handleOptionClick(text, japaneseText, button, ...keys) {
    const isSelected = button.classList.contains('selected'); // ボタンが選択されているかどうかを判定

    if (isSelected) {
        // 選択されている場合は、選択状態を解除し、selectedPromptsから削除
        button.classList.remove('selected');
        selectedPrompts = selectedPrompts.filter(item => !(item.text === text && item.keys == keys.join("-")));
    } else {
        // 選択されていない場合は、選択状態にし、selectedPromptsに追加
        button.classList.add('selected');
        selectedPrompts.push({ text, japaneseText, keys: keys.join("-") });
    }
    updateSelectedPrompts(); // 選択されたプロンプトの表示を更新
}

/**
 * 選択されたプロンプトの表示を更新する関数
 */
function updateSelectedPrompts() {
    // 選択されたプロンプトのリストをクリア
    const list = document.createDocumentFragment();
    const prompt = [];

    // 選択されたプロンプトをリストに表示
    selectedPrompts.forEach((item, index) => {
        const li = document.createElement('li');
        li.classList.add("align-items-center");
        li.dataset.japaneseText = item.japaneseText;

        {
            const closeButton = document.createElement("span");
            closeButton.classList.add("badge", "bg-danger", "text-light", "close-button");
            closeButton.innerHTML = "&times;";
            closeButton.addEventListener("click", (event) => {
                removeSelectedPrompt(item.text, item.keys, event.target);
            });
            li.append(closeButton);
        }
        {
            const block = document.createElement("span");
            block.classList.add("badge", "bg-secondary");
            block.textContent = `${item.japaneseText}`;
            li.append(block);
        }

        list.appendChild(li);
        prompt.push(item.text);
    });
    selectedList.replaceChildren(list);
    selectedPromptText.textContent = prompt.join(", ");
}

/**
 * 選択されたプロンプトを削除する関数
 * @param {string} text - 削除するプロンプトのテキスト（英語）
 * @param {string} keys - 削除するプロンプトのカテゴリー
 * @param {HTMLElement} target - クリックされた要素
 */
function removeSelectedPrompt(text, keys, target) {
    // selectedPromptsから削除
    selectedPrompts = selectedPrompts.filter(item => !(item.text === text && item.keys === keys));

    // 対応するボタンを取得し、選択状態を解除
    const button = Array.from(promptSelector.querySelectorAll('.option-button.selected'))
        .find(button => button.dataset.category === keys && button.textContent === target.closest("li").dataset.japaneseText);
    if (button) {
        button.classList.remove('selected');
    }

    updateSelectedPrompts(); // 選択されたプロンプトの表示を更新
}

/**
 * カテゴリーのコンテナを生成する関数（再帰的にサブカテゴリーを生成）
 * @param {string} categoryName - カテゴリー名
 * @param {string|null} keys - 親カテゴリーのキー（存在しない場合はnull）
 * @returns {Array<HTMLDivElement>} 生成されたコンテナ要素の配列
 */
function createCategoryContainer(options, ...keys) {
    const container = document.createElement('div'); // カテゴリーのコンテナ要素を生成
    container.classList.add('category-container', 'col-md-12', 'mb-1'); // Bootstrapのグリッドクラスとカスタムクラスを追加

    const title = document.createElement('p'); // カテゴリーのタイトル要素を生成
    title.textContent = keys[keys.length - 1]; // タイトルにカテゴリー名を設定
    title.classList.add('category-title'); // タイトルにクラスを追加
    container.appendChild(title); // タイトルをコンテナに追加

    const optionList = document.createElement('ul'); // オプションのリスト要素を生成
    optionList.classList.add('option-list'); // リストにクラスを追加

    if (Array.isArray(options)) {
        // オプションが配列の場合（選択肢の場合）
        options.forEach(option => {
            const optionItem = document.createElement('li'); // 選択肢のリストアイテムを生成
            optionItem.classList.add('option-item'); // アイテムにクラスを追加

            const [japaneseText, text] = option; // 日本語と英語のテキストを取得
            const button = createOptionButton(text, japaneseText, ...keys); // ボタンを生成
            optionItem.appendChild(button); // ボタンをリストアイテムに追加

            optionList.appendChild(optionItem); // リストアイテムをリストに追加
        });
    } else {
        // オプションがオブジェクトの場合（サブカテゴリーの場合）
        for (const subCategory in options) {
            // サブカテゴリーを再帰的に生成し、コンテナに追加
            createCategoryContainer(options[subCategory], ...[...keys, subCategory])
                .forEach(element => container.appendChild(element));
        }
    }

    container.appendChild(optionList); // オプションのリストをコンテナに追加
    return [container]; // コンテナ要素を配列に入れて返す
}

async function loadData() {
    try {
        return await (await fetch("./data.json")).json();
    } catch {
        // テスト用
        return {
            "基本情報": {
                "品質": [
                    ["最高傑作", "best quality"],
                    ["傑作", "masterpiece"],
                    ["高画質", "high quality"],
                ],
                "画風": [
                    ["写実的", "photorealistic"],
                ],
                "シーン/背景": {
                    "場所": {
                        "室内": [
                            ["屋内", "indoors"],
                            ["リビング", "living room"],
                            ["ダイニングルーム", "dining room"],
                            ["キッチン", "kitchen"],
                            ["ベッドルーム", "bedroom"],
                        ],
                        "屋外": [
                            ["屋外", "outdoors"],
                            ["公園", "park"],
                            ["広場", "plaza"],
                            ["街中", "city"],
                            ["路地裏", "back alley"],
                            ["市場", "market"],
                            ["森林", "forest"],
                            ["山", "mountain"],
                        ],
                        "ファンタジー": [
                            ["ファンタジー世界", "fantasy world"],
                            ["城", "castle"],
                            ["古代遺跡", "ancient ruins"]
                        ]
                    }
                }
            }
        };
    }
}

/**
 * プロンプトセレクターを初期化する関数
 */
async function initializePromptSelector() {
    const data = await loadData();

    if (data) {
        // 取得したデータをもとにカテゴリーを生成
        for (const category in data) {
            // トップレベルのカテゴリーから順に生成
            createCategoryContainer(data[category], category).forEach(element => promptSelector.appendChild(element));
        }
    }
}

// プロンプトセレクターの初期化を開始
initializePromptSelector();
