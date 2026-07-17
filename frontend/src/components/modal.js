export class Modal {
    constructor(title, content, options = {}) {
        this.title = title;
        this.content = content;
        this.options = {
            size: 'md', // sm, md, lg
            showFooter: true,
            confirmText: 'Save',
            cancelText: 'Cancel',
            onConfirm: null,
            onCancel: null,
            ...options
        };
        this.overlay = null;
        this.modal = null;
    }

    render() {
        const sizeClass = this.options.size === 'lg' ? 'modal-lg' : this.options.size === 'sm' ? 'modal-sm' : '';
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.innerHTML = `
            <div class="modal ${sizeClass}">
                <div class="modal-header">
                    <h2>${this.title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.content}
                </div>
                ${this.options.showFooter ? `
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">${this.options.cancelText}</button>
                    <button class="btn btn-primary confirm-btn">${this.options.confirmText}</button>
                </div>` : ''}
            </div>
        `;

        // Event listeners
        this.overlay.querySelector('.modal-close')?.addEventListener('click', () => this.close());
        this.overlay.querySelector('.cancel-btn')?.addEventListener('click', () => this.close());
        this.overlay.querySelector('.confirm-btn')?.addEventListener('click', () => {
            if (this.options.onConfirm) {
                const result = this.options.onConfirm(this.overlay);
                if (result !== false) this.close();
            } else {
                this.close();
            }
        });

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Close on Escape
        this.handleEscape = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.handleEscape);

        document.body.appendChild(this.overlay);
        return this.overlay;
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        document.removeEventListener('keydown', this.handleEscape);
        if (this.options.onCancel) {
            this.options.onCancel();
        }
    }

    getElement(selector) {
        return this.overlay?.querySelector(selector);
    }
}

// Quick modal helpers
export function showConfirm(title, message, onConfirm) {
    const modal = new Modal(title, `<p>${message}</p>`, {
        confirmText: 'Confirm',
        onConfirm
    });
    modal.render();
}

export function showFormModal(title, formHtml, onConfirm) {
    const modal = new Modal(title, formHtml, {
        size: 'lg',
        onConfirm
    });
    modal.render();
    return modal;
}
