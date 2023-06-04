document.addEventListener("focusin", (e) => {
    if (e.target.closest(".tox-tinymce, .tox-tinymce-aux, .moxman-window, .tam-assetmanager-root") !== null) {
        e.stopImmediatePropagation();
    }
});

let jsonData = [];
let notes = [];
let folders = [];

window.onload = async () => {

    // this will become an API call to the backend
    jsonData = await (await fetch("/static/data.json")).json();
    notes = jsonData.notes.map(card => `
            <div tabindex=0 index=${card.ID} class="col note index-${card.ID}">
                <div class="note-title">
                    ${card.Title}
                </div>
                <div class="note-body">
                    ${card.Content}
                </div>
            </div>
        `);
    notes.forEach(card => $(".notes").append($(card)))

    // needed later for open-folder screen
    notes = notes.map((v, i, _) => [jsonData.notes[i].ID, v]);

    folders = jsonData.folders
        .map(data => `
            <div tabindex=0 index=${data.ID} class="col folder index-${data.ID}">
                <div class="folder-title">
                    ${data.Name}
                </div>
                <div class="note-body">
                    ${data.Notes.map(i => `<em>${jsonData.notes.filter(n => n.ID == i)[0].Title}</em>`).join("<br/>")}
                </div>
            </div>
        `)
    folders.forEach(card => $(".folders").append($(card)))
    console.log("window load");
    $(".note").click(noteOnClick);
    $(".folder").click(folderOnClick);
    $(".plus-sign").click(e => {
        let noteFieldActive = [...document.getElementById("home-tab").classList].includes("active");
        if (noteFieldActive)
            makeNewNoteScreen();
        else
            makeNewFolderScreen();
    });
    function screenClass() {
        if($(window).innerWidth() < 800) {
            $('#main-screen').addClass('col-12').removeClass('col-8');
        } else {
            $('#main-screen').addClass('col-8').removeClass('col-12');
        }
    }
    
    // Fire.
    screenClass();
    
    // And recheck when window gets resized.
    $(window).resize(_ => screenClass());
};


const makeNewNoteScreen = () => {
    $("#default-editor").remove();
    $(".tox").remove();
    $("#editor-slot-new-note").append('<textarea id="default-editor"></textarea>');
    //init editor
    $("#default-editor").text("");
    tinymce.init({
        selector: 'textarea#default-editor'
    });
    $("#newNoteModalButton").click();
}

function fakeMakeNewNote() {
    let title = document.getElementById("new-note-title").value;
    let content = getDataFromEditor();

    let card = `
        <div tabindex=0 index=${100} class="col note index-${100}">
            <div class="note-title">
                ${title}
            </div>
            <div class="note-body">
                ${content}
            </div>
        </div>`;
    $(".notes").append($(card))
    $(".note").click(noteOnClick);
}

const makeNewFolderScreen = () => {
    $("#newFolderModalButton").click();
}

const util = {
    traverseUpUntilClass: (target, nodeClass) =>
        !![...target.classList].filter(x => x == nodeClass).length ?
            target : util.fromTargetToNote(target.parentElement),

    fromTargetToNote: target =>
        util.traverseUpUntilClass(target, "note"),

    fromTargetToFolder: target =>
        util.traverseUpUntilClass(target, "folder"),

    makePreview: note => {
        note.blur();
        let [title] =
            [...note.childNodes]
                .filter(node => node.classList)
                .filter(node => node.classList.contains("note-title"))
                .map(x => x.innerHTML);

        let [body] =
            [...note.childNodes]
                .filter(node => node.classList)
                .filter(node => node.classList.contains("note-body"))
                .map(x => x.innerHTML);

        let id =
            +[...note.classList]
                .filter(x => x.includes("index-"))[0]
                .replace("index-", "");

        let timeStamp = jsonData.notes.filter(x => x.ID == id)[0]?.TimeStamp;

        let preview = `
            <div class="col-4 card note-preview" id="note-on-display">
                <div class="card-header">
                    <h3>${title}</h3>
                </div>
                <div class="card-body">
                    ${body}
                </div>
                <div class="card-footer">
                    <small>Created on ${timeStamp == undefined ? timeStamp : "xx/xx/xxxx"}</small>
                </div>
            </div>
        `;
        $("#preview").html(preview);
        $("#note-on-display").click(() => {
            if ($("#preview")[0].innerHTML.trim() == '') return;
            $("#openModal").click()
        });
        util.loadEditor(title, body, id);
    },

    openFolderPreview: folder => {
        folder.blur();
        let id =
            +[...folder.classList]
                .filter(x => x.includes("index-"))[0]
                .replace("index-", "");

        let folderObject = jsonData.folders.filter(f => f.ID == id)[0]
        let folderNotes = jsonData.notes
            .filter(n => folderObject.Notes.includes(n.ID))
            .map(card => `
                <div tabindex=0 index=${card.ID} class="col folder-note note index-${card.ID}">
                    <div class="note-title">
                        ${card.Title}
                    </div>
                    <div class="note-body">
                        ${card.Content}
                    </div>
                </div>
            `);
        $("#folder-name").html(folderObject.Name)
        let preview = `
            <div class="col-4 card note-preview">
                <div class="card-header">
                    <h3>${folderObject.Name}</h3>
                </div>
                <div class="card-body">
                    <div class="grid">
                        <div class="row">
                            ${folderNotes.join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;
        $("#preview").html(preview);
        $(".folder-note").click(e => {
            console.log(e);
            util.makePreview(util.fromTargetToNote(e.target))
            $("#note-on-display").click()
            util.openFolderPreview(folder);
        });
    },

    loadEditor: (title, body, id) => {
        // remove editor
        $("#default-editor").remove();
        $(".tox").remove();
        $("#editor-slot").append('<textarea id="default-editor"></textarea>');
        //init editor
        $("#show-note-title")[0].value = title.trim();
        $("#default-editor").text(`${body}`);
        tinymce.init({
            selector: 'textarea#default-editor'
        });
    }

}

const noteOnClick = e => {
    util.makePreview(util.fromTargetToNote(e.target))
    if ($(window).width() <= 800) $("#note-on-display").click()
}

const folderOnClick = e => {
    util.openFolderPreview(e.currentTarget);

    //todo finish this
    if ($(window).width() <= 800) {
        let folder = e.currentTarget;
        /*  first load folder data into the modal  */
        folder.blur();
        let id =
            +[...folder.classList]
                .filter(x => x.includes("index-"))[0]
                .replace("index-", "");

        let folderObject = jsonData.folders.filter(f => f.ID == id)[0]
        let folderNotes = jsonData.notes
            .filter(n => folderObject.Notes.includes(n.ID))
            .map(card => `
                <div tabindex=0 index=${card.ID} class="col folder-note note index-${card.ID}">
                    <div class="note-title">
                        ${card.Title}
                    </div>
                    <div class="note-body">
                        ${card.Content}
                    </div>
                </div>
            `);
        $("#folder-name").html(folderObject.Name)
        let preview = `
            <div class="col-4 card note-preview">
                <div class="card-header">
                    <h3>${folderObject.Name}</h3>
                </div>
                <div class="card-body">
                    <div class="grid">
                        <div class="row">
                            ${folderNotes.join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;
        $("#folders-go-here").html(preview);
        $(".note").click(noteOnClick);
        $("#openFolderModal").click()
    }
}


/*==============================================================================================*/

const getDataFromEditor = () => tinymce.get('default-editor').getContent();

const noteEditClose = () => { }

const saveNote = () => { }
