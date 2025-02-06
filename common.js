class PromptGroup {
    category;
    parent;
    children = [];

    constructor(tree, category = undefined, parent = undefined) {
        this.category = category;
        this.parent = parent;

        if (Array.isArray(tree)) {
            for (const leaf of tree) {
                this.children.push(new Prompt(leaf, this));
            }
        } else {
            for (const subCategory in tree) {
                this.children.push(new PromptGroup(tree[subCategory], subCategory, this));
            }
        }
        Object.freeze(this);
    }

    findByJapaneseText(japaneseText) {
        return this[Symbol.iterator]().find(p => p.japaneseText == japaneseText);
    }

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
    japaneseText;
    text;
    parent;
    constructor([japaneseText, text], parent) {
        this.japaneseText = japaneseText;
        this.text = text;
        this.parent = parent;
        Object.freeze(this);
    }
}
/**
 * 
 * @returns {PromptGroup}
 */
async function loadPrompt() {
    return new PromptGroup(await (await fetch("./data.json")).json());
}
