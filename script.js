let excelData = [];
let fileName = '';

function showAlert(message, type = 'info') {
    const alert = document.getElementById('customAlert');
    const icon = alert.querySelector('i');
    const messageDiv = alert.querySelector('.alert-message');
    
    messageDiv.textContent = message;
    alert.className = `custom-alert ${type} show`;
    
    if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
    } else if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else if (type === 'warning') {
        icon.className = 'fas fa-exclamation-triangle';
    } else {
        icon.className = 'fas fa-info-circle';
    }
    
    setTimeout(hideAlert, 5000);
}

function hideAlert() {
    const alert = document.getElementById('customAlert');
    alert.classList.remove('show');
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

document.getElementById('excelFile').addEventListener('change', function(e) {
    handleFile(e.target.files[0]);
});

const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('pulse');
    dropZone.style.borderColor = 'var(--primary-color)';
    dropZone.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('pulse');
    dropZone.style.borderColor = 'var(--border-color)';
    dropZone.style.backgroundColor = '';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('pulse');
    dropZone.style.borderColor = 'var(--border-color)';
    dropZone.style.backgroundColor = '';
    
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    if (!file) return;
    
    showLoading();
    fileName = file.name;
    document.getElementById('fileInfo').innerHTML = `Selected file: <span class="file-name">${fileName}</span>`;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let data;
            if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                const csvData = e.target.result;
                const lines = csvData.split('\n');
                excelData = [];
                
                lines.forEach(line => {
                    const items = line.split(/[,;\t|]/).map(item => item.trim());
                    excelData = excelData.concat(items);
                });
            } else {
                data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                excelData = [];
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                    
                    sheetData.forEach(row => {
                        if (Array.isArray(row)) {
                            excelData = excelData.concat(row);
                        } else {
                            excelData.push(row);
                        }
                    });
                });
            }
            
            excelData = excelData.map(item => {
                if (typeof item === 'string') return item.trim();
                if (typeof item === 'number') return item.toString();
                return item;
            }).filter(item => item !== "" && item !== undefined && item !== null);
            
            console.log('File loaded successfully. Total items:', excelData.length);
            showAlert('File loaded successfully!', 'success');
        } catch (error) {
            console.error('Error reading file:', error);
            showAlert('Error reading file. Please make sure it\'s a valid file format.', 'error');
        } finally {
            setTimeout(() => {
                hideLoading();
            }, 500);
        }
    };
    
    reader.onerror = function() {
        hideLoading();
        showAlert('Error reading file. Please try again.', 'error');
    };
    
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

function processData() {
    const userInput = document.getElementById('userData').value;
    const userData = userInput.split('\n')
        .map(item => item.trim())
        .filter(item => item);
    
    const userDataCount = userData.length;
    
    if (excelData.length === 0) {
        showAlert("Please upload a file first", "error");
        return;
    }
    
    if (userDataCount === 0) {
        showAlert("Please enter data to match", "error");
        return;
    }
    
    document.getElementById('progressContainer').style.display = 'block';
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    const chunkSize = 1000;
    const totalChunks = Math.ceil(userData.length / chunkSize);
    let matches = [];
    let nonMatches = [];
    
    function isMatch(searchItem, excelItem) {
        const strSearch = searchItem.toString().trim().toLowerCase();
        const strExcel = excelItem.toString().trim().toLowerCase();
        
        if (strSearch === strExcel) return true;
        
        if (!isNaN(strSearch) && !isNaN(strExcel)) {
            return parseFloat(strSearch) === parseFloat(strExcel);
        }
        
        if (strSearch.localeCompare(strExcel, undefined, { sensitivity: 'base' }) === 0) {
            return true;
        }
        
        return false;
    }
    
    function processChunk(chunkIndex) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, userData.length);
        const chunk = userData.slice(start, end);
        
        chunk.forEach(item => {
            let found = false;
            
            for (let i = 0; i < excelData.length; i++) {
                if (isMatch(item, excelData[i])) {
                    matches.push(item);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                nonMatches.push(item);
            }
        });
        
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Processing... ${Math.round(progress)}% complete`;
        
        if (chunkIndex < totalChunks - 1) {
            setTimeout(() => processChunk(chunkIndex + 1), 0);
        } else {
            displayResults(matches, nonMatches, userDataCount);
        }
    }
    
    processChunk(0);
}

function displayResults(matches, nonMatches, userDataCount) {
    document.getElementById('progressContainer').style.display = 'none';
    
    document.getElementById('totalRecords').textContent = userDataCount.toLocaleString();
    document.getElementById('matches').textContent = matches.length.toLocaleString();
    document.getElementById('nonMatches').textContent = nonMatches.length.toLocaleString();
    
    const matchesList = document.getElementById('matchesList');
    const nonMatchesList = document.getElementById('nonMatchesList');
    
    matchesList.innerHTML = '';
    nonMatchesList.innerHTML = '';
    
    document.getElementById('matchesCount').textContent = matches.length;
    document.getElementById('nonMatchesCount').textContent = nonMatches.length;
    
    if (matches.length > 0) {
        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                ${item}
                <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(item)}')"><i class="far fa-copy"></i></button>
            `;
            matchesList.appendChild(div);
        });
    } else {
        matchesList.innerHTML = '<div class="result-item">No matches found</div>';
    }
    
    if (nonMatches.length > 0) {
        nonMatches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                ${item}
                <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(item)}')"><i class="far fa-copy"></i></button>
            `;
            nonMatchesList.appendChild(div);
        });
    } else {
        nonMatchesList.innerHTML = '<div class="result-item">All items matched</div>';
    }
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = event.target.innerHTML;
        event.target.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            event.target.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showAlert('Failed to copy text to clipboard', 'error');
    });
}

function copyAll(listId) {
    const container = document.getElementById(listId);
    const items = Array.from(container.querySelectorAll('.result-item'))
        .map(item => item.textContent.trim().replace('Copied!', '').trim())
        .filter(item => item !== 'No matches found' && item !== 'All items matched');
    
    if (items.length > 0) {
        navigator.clipboard.writeText(items.join('\n')).then(() => {
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied to clipboard!';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
            showAlert('All items copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showAlert('Failed to copy items to clipboard', 'error');
        });
    }
}