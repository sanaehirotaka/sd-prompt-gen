(new (class {
    /** @type {PromptCategory} */
    categoryRoot;
    /** @type {Map<string, Prompt>} */
    fromIdLookup;
    /** @type {Map<string, Prompt[]>} */
    fromTextLookup;

    selectedPrompt = new PromptGroup();
    promptSelector = document.querySelector("#prompt-selector");
    selectedList = document.querySelector("#selected-list");
    selectedPromptText = document.querySelector("#selected-prompt-text");

    addGroupButton = document.querySelector("#add-group-button");
    removeGroupButton = document.querySelector("#remove-group-button");

    async start() {
        this.categoryRoot = new PromptCategory(await loadPrompt());
        this.fromIdLookup = new Map([...this.categoryRoot].map(p => [p.id, p]));
        this.fromTextLookup = [...this.categoryRoot].map(p => [p.text, p]).reduce((acc, [key, value]) => {
            if (!acc.has(key)) {
                acc.set(key, []);
            }
            acc.get(key).push(value);
            return acc;
        }, new Map());

        this.promptSelector.addEventListener("input", this.clickPromptSelector.bind(this));
        this.addGroupButton.addEventListener("click", this.clickAddGroupButton.bind(this));
        this.removeGroupButton.addEventListener("click", this.clickRemoveGroupButton.bind(this));
        this.writePromptSelector(this.promptSelector, this.categoryRoot);

        console.log(this);
    }

    writeSelectedPrompt() {
        this.selectedList.replaceChildren(...this.selectedPrompt.toElements());
        this.selectedPromptText.replaceChildren(this.selectedPrompt.toString());
    }

    /**
     * @param {Element} area
     * @param {PromptCategory} PromptCategory
     */
    writePromptSelector(area, category) {
        let buttonsWrapper = undefined;
        for (const prompt of category.children) {
            if (prompt instanceof PromptCategory) {
                const container = document.createElement("div");
                container.classList.add("category-container", "mb-1");
                const title = document.createElement("div");
                title.classList.add("category-title");
                title.append(prompt.category);
                container.append(title);
                this.writePromptSelector(container, prompt);
                area.append(container);
            }
            if (prompt instanceof Prompt) {
                const button = document.createElement("input");
                button.classList.add("btn-check");
                button.setAttribute("type", "checkbox");
                button.setAttribute("id", prompt.id);
                button.setAttribute("autocomplete", "off");
                const label = document.createElement("label");
                label.classList.add("btn", "btn-sm", "btn-outline-primary");
                label.setAttribute("for", prompt.id);
                label.append(prompt.japaneseText);

                const buttonWrapper = document.createElement("li");
                buttonWrapper.classList.add("option-item");
                buttonWrapper.append(button);
                buttonWrapper.append(label);

                if (!buttonsWrapper) {
                    buttonsWrapper = document.createElement("ul");
                    buttonsWrapper.classList.add("option-list");
                    area.append(buttonsWrapper);
                }
                buttonsWrapper.append(buttonWrapper);
            }
        }
    }

    getCheckedPrompts() {
        return [...this.selectedList.querySelectorAll(":checked")]
            .map(e => e.dataset.id)
            .map(id => this.fromIdLookup.get(id))
            .filter(p => p);
    }

    getCommonParent(...promptGroups) {
        const parents = promptGroups.map(([prompt, group]) => {
            if (group)
                return [group, ...group.getParents()];
            return [];
        });
        const length = Math.min(...parents.map(p => p.length));
        for (let i = 0; i < length; i++) {
            if (parents.every(p => p[i] === parents[0][i])) {
                return parents[0][i];
            }
        }
        return undefined;
    }

    clickPromptSelector(event) {
        /** @type {HTMLInputElement} */
        const button = event.target;
        const prompt = this.fromIdLookup.get(event.target.getAttribute("id"));
        if (!prompt) return;
        if (button.checked) {
            this.selectedPrompt.append(new PromptGroup(prompt));
        } else {
            this.selectedPrompt.findGroup(prompt).remove(prompt);
        }
        this.writeSelectedPrompt();
    }

    clickAddGroupButton(event) {
        const checkedPrompts = this.getCheckedPrompts();
        if (checkedPrompts.length > 1) {
            const groups = checkedPrompts.map(p => [p, this.selectedPrompt.findGroup(p)]);
            const commonParent = this.getCommonParent(...groups) ?? this.selectedPrompt;
            commonParent.append(new PromptGroup(...checkedPrompts.map(p => new PromptGroup(p))));
            groups.forEach(([prompt, group]) => group.remove(prompt));
        }
        this.writeSelectedPrompt();
    }

    clickRemoveGroupButton(event) {
        const checkedPrompts = this.getCheckedPrompts();
        const groups = checkedPrompts.map(p => [p, this.selectedPrompt.findGroup(p)]).filter(([prompt, group]) => group !== this.selectedPrompt);
        const commonParent = this.selectedPrompt;
        commonParent.append(...groups.map(([prompt, group]) => new PromptGroup(prompt)));
        groups.forEach(([prompt, group]) => group.remove(prompt));
        this.writeSelectedPrompt();
    }
})).start();
