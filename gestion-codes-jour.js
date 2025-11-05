class GestionCodesJour {
    constructor() {
        this.months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        this.days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.codes = {};
        this.yearDropdown = null;
    }

    async init() {
        this.renderYearMonthNav();
        this.createYearDropdown();
        this.setupEventListeners();
        await this.loadMonthData(this.currentYear, this.currentMonth);
    }

    async loadMonthData(year, month) {
        this.showSpinner(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/codes-jour/${year}/${month + 1}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Réponse du serveur non valide');
            const data = await response.json();
            this.codes = data.codes || {};
            this.renderCalendar(year, month);
        } catch (error) {
            console.error('Erreur lors du chargement des codes:', error);
            this.showError('Impossible de charger les données. Veuillez réessayer.');
        } finally {
            this.showSpinner(false);
        }
    }

// ✅ NOUVELLE VERSION - Simple wrapper vers la fonction globale
async showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirmation-modal');
        const messageEl = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-button-ok');
        const cancelBtn = document.getElementById('modal-button-cancel');

        if (!modal || !okBtn || !cancelBtn) {
            console.error('Modale introuvable');
            resolve(false);
            return;
        }

        if (messageEl) messageEl.textContent = message;

        // Nettoyer les anciens listeners
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Afficher la modale
        modal.style.display = 'flex';
        modal.classList.add('show');

        const handleOk = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            resolve(false);
        };

        newOkBtn.addEventListener('click', handleOk);
        newCancelBtn.addEventListener('click', handleCancel);
    });
}
    
    // NOUVELLE VERSION
async saveAllCodes() {
    // 1. On demande la confirmation à l'utilisateur
    const confirmed = await this.showConfirmation('Souhaitez-vous enregistrer les codes jours ?');

    // 2. Si l'utilisateur clique "Non" ou ferme la modale, on arrête tout.
    if (!confirmed) {
        return; 
    }

    // 3. Si c'est confirmé, on continue avec la logique de sauvegarde
    this.showSpinner(true);
    const codesToSave = {};
    const inputs = document.querySelectorAll('#calendar input[data-date]');
    inputs.forEach(input => {
        if (input.value.trim()) {
            codesToSave[input.dataset.date] = input.value.toUpperCase();
        }
    });

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/codes-jour/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ codes: codesToSave })
        });
        if (!response.ok) throw new Error('Sauvegarde en masse échouée');
        
        // On remplace le simple 'alert' par une notification plus jolie
        this.showAlert('Codes sauvegardés avec succès !', 'success'); 
        this.codes = { ...this.codes, ...codesToSave }; // Mise à jour plus sûre
        
    } catch (error) {
        this.showError('La sauvegarde des codes a échoué.');
    } finally {
        this.showSpinner(false);
    }
}

    generateCodes(type) {
        let newCodes = (type === 'month') ? this.generateMonthCodes() : this.generateYearCodes();
        Object.assign(this.codes, newCodes);
        this.renderCalendar(this.currentYear, this.currentMonth);
    }

    renderCalendar(year, month) {
        const calendar = document.getElementById('calendar');
        if (!calendar) return;
        calendar.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'week-row';
        ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'day-header';
            cell.textContent = day;
            header.appendChild(cell);
        });
        calendar.appendChild(header);

        const today = new Date();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let firstDayOfWeek = firstDayOfMonth.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        const cells = [];
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push('<div class="day-cell empty"></div>');
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const code = this.codes[dateStr] || '';
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
           cells.push(`
    <div class="day-cell ${isToday ? 'today' : ''}">
        <span>${day}</span>
        <input type="text" value="${code}" placeholder="..." data-date="${dateStr}" />
    </div>
`);
        }

        for (let i = 0; i < cells.length; i += 7) {
            const row = document.createElement('div');
            row.className = 'week-row';
            row.innerHTML = cells.slice(i, i + 7).join('');
            calendar.appendChild(row);
        }

        // ## CORRECTION ## : L'input met à jour le cache local, mais n'appelle PLUS de fonction de sauvegarde.
        calendar.querySelectorAll('input[data-date]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.codes[e.target.dataset.date] = e.target.value.toUpperCase();
            });
        });
    }

renderYearMonthNav() {
        const nav = document.getElementById('yearMonthNav');
        if (!nav) return;
        nav.innerHTML = `<div class="year-select-btn" id="yearSelectBtn">${this.currentYear}</div><div class="month-nav" id="monthNav"></div>`;
        
        const monthNav = document.getElementById('monthNav');
        this.months.forEach((month, index) => {
            const btn = document.createElement('button');
            btn.className = `month-btn ${index === this.currentMonth ? 'active' : ''}`;
            btn.textContent = month;
            btn.onclick = async () => {
                this.currentMonth = index;
                this.renderYearMonthNav(); // CETTE LIGNE A ÉTÉ AJOUTÉE
                await this.loadMonthData(this.currentYear, this.currentMonth);
            };
            monthNav.appendChild(btn);
        });
    }
    
createYearDropdown() {
        if (this.yearDropdown) this.yearDropdown.remove();
        this.yearDropdown = document.createElement('div');
        this.yearDropdown.className = 'year-dropdown';
        const anneeActuelle = new Date().getFullYear();
        const years = [anneeActuelle, anneeActuelle + 1];
        years.forEach(year => {
            const option = document.createElement('div');
            option.className = 'year-option';
            option.textContent = year;
            option.onclick = async () => {
                this.currentYear = year;
                this.renderYearMonthNav(); // CETTE LIGNE A ÉTÉ AJOUTÉE
                await this.loadMonthData(this.currentYear, this.currentMonth);
                this.yearDropdown.style.display = 'none';
            };
            this.yearDropdown.appendChild(option);
        });
        document.body.appendChild(this.yearDropdown);
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'yearSelectBtn') {
                e.preventDefault();
                e.stopPropagation();
                this.toggleYearDropdown();
            } else if (this.yearDropdown && this.yearDropdown.style.display === 'block' && !this.yearDropdown.contains(e.target)) {
                this.yearDropdown.style.display = 'none';
            }
        });
        document.getElementById('generateMonthBtn').addEventListener('click', () => this.generateCodes('month'));
        document.getElementById('generateYearBtn').addEventListener('click', () => this.generateCodes('year'));
        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportToPDF());
        const saveButton = document.getElementById('saveCodesBtn');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveAllCodes());
        }
    }

    toggleYearDropdown() {
        const yearBtn = document.getElementById('yearSelectBtn');
        if (!this.yearDropdown || !yearBtn) return;
        if (this.yearDropdown.style.display === 'block') {
            this.yearDropdown.style.display = 'none';
        } else {
            const rect = yearBtn.getBoundingClientRect();
            this.yearDropdown.style.left = `${rect.left}px`;
            this.yearDropdown.style.top = `${rect.bottom}px`;
            this.yearDropdown.style.width = `${rect.width}px`;
            this.yearDropdown.style.display = 'block';
        }
    }

    generateMonthCodes() {
        const newCodes = {};
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayIndex = new Date(this.currentYear, this.currentMonth, d).getDay();
            newCodes[dateStr] = `${this.days[dayIndex]} ${Math.floor(Math.random() * 900) + 100}`;
        }
        return newCodes;
    }

    generateYearCodes() {
        const newCodes = {};
        for (let m = 0; m < 12; m++) {
            const daysInMonth = new Date(this.currentYear, m + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${this.currentYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayIndex = new Date(this.currentYear, m, d).getDay();
                newCodes[dateStr] = `${this.days[dayIndex]} ${Math.floor(Math.random() * 900) + 100}`;
            }
        }
        return newCodes;
    }

    async exportToPDF() {
        if (typeof html2pdf === 'undefined') { this.showError('La bibliothèque PDF n\'est pas chargée.'); return; }
        const elementToExport = document.getElementById('codes-jour-content').cloneNode(true);
        if(elementToExport.querySelector('.controls')) {
            elementToExport.querySelector('.controls').remove();
        }
        const opt = { margin: 5, filename: `codes_${this.currentYear}_${this.months[this.currentMonth]}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
        html2pdf().from(elementToExport).set(opt).save();
    }

    showSpinner(show) {
        const spinner = document.querySelector('#calendar .spinner');
        if (spinner) spinner.style.display = show ? 'block' : 'none';
    }

    showAlert(message, type = 'info') {
    // On peut réutiliser le style d'alerte de capacite-alert ou en créer un nouveau
    const alertDiv = document.createElement('div');
    alertDiv.className = `capacite-alert ${type}`; 
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    // Animation d'entrée
    setTimeout(() => alertDiv.classList.add('show'), 10);
    
    // Suppression automatique
    setTimeout(() => {
        alertDiv.classList.remove('show');
        alertDiv.addEventListener('transitionend', () => alertDiv.remove(), { once: true });
    }, 3000);
    }
}
