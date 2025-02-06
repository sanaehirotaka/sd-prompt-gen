// HTML要素を取得
const promptSelector = document.getElementById('prompt-selector');
const selectedList = document.getElementById('selected-list');
const selectedPromptText = document.getElementById('selected-prompt-text');
const addGroup = document.getElementById('add-group-button');
const removeGroup = document.getElementById('remove-group-button');
const importPromptDialog = document.getElementById("import-prompt-dialog");

// 
let promptOrder = [];
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
    button.dataset.category = keys.join("-");
    button.dataset.text = text;
    button.dataset.japaneseText = japaneseText;

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
        selectedPrompts.push({
            text,
            japaneseText,
            group: undefined,
            keys: keys.join("-")
        });
    }
    updateSelectedPrompts(); // 選択されたプロンプトの表示を更新
}
function sortPrompts() {
    const groupIndex = selectedPrompts
        .map(({ group }, index) => [group, index])
        .filter(([group]) => group)
        .reduce((map, [group, index]) => {
            const a = map[group] ?? Number.MAX_SAFE_INTEGER;
            const b = promptOrder[`${selectedPrompts[index].keys}-${selectedPrompts[index].japaneseText}`].index;
            map[group] = Math.min(a, b);
            return map;
        }, {});
    selectedPrompts = selectedPrompts.sort((a, b) => {
        if (a.group == b.group) {
            return promptOrder[`${a.keys}-${a.japaneseText}`].index - promptOrder[`${b.keys}-${b.japaneseText}`].index;
        }
        const aIndex = groupIndex[a.group] ?? promptOrder[`${a.keys}-${a.japaneseText}`].index;
        const bIndex = groupIndex[b.group] ?? promptOrder[`${b.keys}-${b.japaneseText}`].index;
        return aIndex - bIndex;
    });
}

/**
 * 選択されたプロンプトの表示を更新する関数
 */
function updateSelectedPrompts() {
    sortPrompts();

    const list = document.createDocumentFragment();

    for (const prompt of selectedPrompts) {
        const button = Array.from(promptSelector.querySelectorAll('.option-button:not(.selected)'))
            .find(button => button.dataset.category === prompt.keys && button.textContent === prompt.japaneseText);
        if (button) {
            button.classList.add('selected');
        }
    }

    for (const groupPrompt of getGroupedPrompts()) {

        const prompts = Array.isArray(groupPrompt) ? groupPrompt : [groupPrompt];
        let group = list;
        if (Array.isArray(groupPrompt)) {
            const li = document.createElement('li');
            group = document.createElement('ul');
            group.classList.add("list-unstyled");
            li.append(group);
            list.append(li);
        }
        for (const prompt of prompts) {
            const li = document.createElement('li');
            li.dataset.japaneseText = prompt.japaneseText;
            li.classList.add("d-flex")
            group.appendChild(li);

            const wrap = document.createElement("div");
            wrap.classList.add("flex-fill");
            li.append(wrap);

            const inputGroup = document.createElement("div");
            inputGroup.classList.add("input-group", "input-group-sm");
            wrap.append(inputGroup);

            const checkBoxWrap = document.createElement("div");
            checkBoxWrap.classList.add("input-group-text");
            inputGroup.append(checkBoxWrap);

            const checkBox = document.createElement("input");
            checkBox.setAttribute("type", "checkbox");
            checkBox.classList.add("form-check-input");
            checkBox.dataset.category = prompt.keys;
            checkBox.dataset.text = prompt.text;
            checkBox.dataset.japaneseText = prompt.japaneseText;
            checkBoxWrap.append(checkBox);

            const closeBtn = document.createElement("button");
            closeBtn.classList.add("btn", "btn-danger");
            closeBtn.addEventListener("click", event => {
                removeSelectedPrompt(prompt.text, prompt.keys, event.target);
            });
            inputGroup.append(closeBtn);
            const icon = document.createElement("i");
            icon.classList.add("bi", "bi-x-circle");
            closeBtn.append(icon);
            const text = document.createElement("span");
            text.classList.add("input-group-text");
            text.append(prompt.japaneseText);
            inputGroup.append(text);
        }
    }
    selectedList.replaceChildren(list);
    selectedPromptText.textContent = getGroupedPrompts().map(g => Array.isArray(g) ? `(${g.map(p => p.text).join(", ")})` : g.text).join(", ");
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

function* promptOrderList(parentKeys, obj) {
    for (const child in obj) {
        const childKeys = [...parentKeys, child];
        if (Array.isArray(obj[child])) {
            for (const [value, text] of obj[child]) {
                yield {keys : [...childKeys, value], text: text};
            }
        } else {
            yield* promptOrderList(childKeys, obj[child]);
        }
    }
}

/**
 * プロンプトセレクターを初期化する関数
 */
async function initializePromptSelector() {
    const loadPrompts = await loadData();
    promptOrder = Object.fromEntries([...promptOrderList([], loadPrompts)].map((v, index) => [v.keys.join("-"), { index, text: v.text }]))

    // 取得したデータをもとにカテゴリーを生成
    for (const category in loadPrompts) {
        // トップレベルのカテゴリーから順に生成
        createCategoryContainer(loadPrompts[category], category)
            .forEach(element => promptSelector.appendChild(element));
    }
}

function getCheckedPrompts() {
    return [...selectedList.querySelectorAll("input:checked")]
        .map(e => selectedPrompts.find(item => item.keys == e.dataset.category && item.japaneseText == e.dataset.japaneseText));
}
function getGroupedPrompts() {
    const groupedPrompts = [];
    for (const prompt of selectedPrompts) {
        if (prompt.group) {
            let group;
            if (groupedPrompts.length == 0 || !Array.isArray(groupedPrompts[groupedPrompts.length - 1]) || groupedPrompts[groupedPrompts.length - 1][0].group != prompt.group) {
                groupedPrompts.push(group = []);
            } else {
                group = groupedPrompts[groupedPrompts.length - 1];
            }
            group.push(prompt);
        } else {
            groupedPrompts.push(prompt);
        }
    }
    return groupedPrompts;
}

selectedList.addEventListener("input", event => {
    const checkedPrompts = getCheckedPrompts();
    const isMultigroup = new Set(checkedPrompts.filter(p => p.group).map(p => p.group)).size > 1;
    if (checkedPrompts.some(p => !p.group) || isMultigroup) {
        addGroup.removeAttribute("disabled");
    } else {
        addGroup.setAttribute("disabled", "");
    }
    if (checkedPrompts.some(p => p.group)) {
        removeGroup.removeAttribute("disabled");
    } else {
        removeGroup.setAttribute("disabled", "");
    }
});

addGroup.addEventListener("click", event => {
    const checkedPrompts = getCheckedPrompts();
    const group = checkedPrompts.find(p => p.group)?.group ?? Date.now();
    checkedPrompts.forEach(p => p.group = group);
    updateSelectedPrompts();
    addGroup.setAttribute("disabled", "");
    removeGroup.setAttribute("disabled", "");
});

removeGroup.addEventListener("click", event => {
    const checkedPrompts = getCheckedPrompts();
    checkedPrompts.forEach(p => p.group = undefined);
    updateSelectedPrompts();
    addGroup.setAttribute("disabled", "");
    removeGroup.setAttribute("disabled", "");
});

document.querySelector("#open-import").addEventListener("click", () => {
    importPromptDialog.showModal();
});

importPromptDialog.addEventListener("click", e => {
    if (importPromptDialog == e.target) {
        document.querySelector("#import-prompt-text").value = "";
        document.querySelector("#import-after").textContent = "";
        importPromptDialog.close();
    }
});

function parseKeywords(keywordString) {
    const result = [];
    let currentString = "";
    let inParentheses = false;
    let currentArray = null;
    for (let i = 0; i < keywordString.length; i++) {
        const char = keywordString[i];
        if (char === '(') {
            inParentheses = true;
            currentArray = [];
            currentString = ""; // Reset currentString for the array
        } else if (char === ')') {
            inParentheses = false;
            currentArray.push(currentString.trim());
            result.push(currentArray);
            currentArray = null;
            currentString = ""; // Reset currentString for the next keyword
        } else if (char === ',' && inParentheses) {
            currentArray.push(currentString.trim());
            currentString = "";
        } else if (char === ',' && !inParentheses) {
            if (currentString.trim() !== "") { //Prevent pushing empty string
                result.push(currentString.trim());
            }
            currentString = "";
        } else {
            currentString += char;
        }
    }
    // Process the last keyword if it's not inside parentheses
    if (currentString.trim() !== "") {
        result.push(currentString.trim());
    }
    return result;
}
  

function importPromptPreview() {
    /** @type {HTMLTextAreaElement} */
    const input = document.querySelector("#import-prompt-text");
    const words = parseKeywords(input.value);
    const promptList = Object.entries(promptOrder);

    const importPrompts = [];
    let groupId = 1;
    
    for (const group of words) {
        if (Array.isArray(group)) {
            groupId++;

            for (const word of group) {
                const [key] = promptList.find(([key, {text}]) => text == word) ?? [];
                if (key) {
                    const keys = key.split("-");
                    importPrompts.push({
                        group: groupId,
                        japaneseText: keys[keys.length - 1],
                        keys: key.substring(0, key.lastIndexOf("-") - 1),
                        text: word
                    });
                }
            }
        } else {
            const [key] = promptList.find(([key, {text}]) => text == group) ?? [];
            if (key) {
                const keys = key.split("-");
                importPrompts.push({
                    japaneseText: keys[keys.length - 1],
                    keys: key.substring(0, key.lastIndexOf("-") - 1),
                    text: group
                });
            }
        }
    }
    document.querySelector("#import-after").replaceChildren(...importPrompts.map(p => {
        const prompt = document.createElement("span");
        prompt.classList.add("border", "rounded", "p-1", "m-1");
        prompt.append(p.japaneseText);
        return prompt;
    }));
}

function importPrompt() {
    /** @type {HTMLTextAreaElement} */
    const input = document.querySelector("#import-prompt-text");
    const words = parseKeywords(input.value);
    const promptList = Object.entries(promptOrder);

    const importPrompts = [];
    let groupId = 1;
    
    for (const group of words) {
        if (Array.isArray(group)) {
            groupId++;

            for (const word of group) {
                const [key] = promptList.find(([key, {text}]) => text == word) ?? [];
                if (key) {
                    const keys = key.split("-");
                    importPrompts.push({
                        group: groupId,
                        japaneseText: keys[keys.length - 1],
                        keys: key.substring(0, key.lastIndexOf("-")),
                        text: word
                    });
                }
            }
        } else {
            const [key] = promptList.find(([key, {text}]) => text == group) ?? [];
            if (key) {
                const keys = key.split("-");
                importPrompts.push({
                    japaneseText: keys[keys.length - 1],
                    keys: key.substring(0, key.lastIndexOf("-")),
                    text: group
                });
            }
        }
    }
    for (const newPrompt of importPrompts) {
        if (!selectedPrompts.some(p => p.text == newPrompt.text)) {
            selectedPrompts.push(newPrompt);
        }
    }
    updateSelectedPrompts();

    document.querySelector("#import-prompt-text").value = "";
    document.querySelector("#import-after").textContent = "";
    importPromptDialog.close();
}

document.querySelector("#import-prompt-text").addEventListener("input", importPromptPreview);
document.querySelector("#import-button").addEventListener("click", importPrompt);

// プロンプトセレクターの初期化を開始
initializePromptSelector();
