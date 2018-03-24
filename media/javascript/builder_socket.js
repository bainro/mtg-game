socket.on('new deck created', (deck_name) => {
    //if keep cards box is checked then do not empty the <ul>
    if (!($('#keep-cards:checked').length)) {
        $('#cards-in-deck').empty();
        $('#cards-in-deck').eq(0).css('border-color', '#E5F5FF');
    }
    //add the card_name to the options
    var tempItem = $("<option>", { class: "deck-select", text: deck_name });
    $('#deck-options').append(tempItem);
    //select fresh option
    $('#deck-options').val(deck_name);
    //set data_deck
    $('#cards-in-deck').attr('data_deck', $('#deck-options').val());
});

socket.on('deck renamed', (old_name, new_name) => {
    //rename deck option
    var $deck_option_to_rename = findElementByText(old_name, "option");
    $deck_option_to_rename.text(new_name);
    //update deck_data on <ul>
    $('#cards-in-deck').attr('data_deck', new_name);
});

socket.on('give deck options', function (options) {
    var tempItem;
    for (var i = 0; i < options.length; i++) {
        tempItem = $("<option>", { class: "deck-select", text: options[i].name });
        $('#deck-options').append(tempItem);
    }
});

socket.on('given deck', function (deck) {
    //for each card in the response put it into a <li>
    var $list = $('#cards-in-deck');
    $list.empty();
    $('#cards-in-deck').eq(0).css('border-color', 'black');
    var tempItem = undefined,
        tempSpan;
    for (var i = 0; i < deck.length; i++) {
        tempItem = $("<li>", { class: "card-li", text: deck[i].name, data_card_id: deck[i].card_id, data_set_id: deck[i].set_id });
        tempSpan = $("<span>", { class: "glyphicon glyphicon-remove" });
        $list.append(tempItem.append(tempSpan));
    }
});

socket.on('deck creation fail', (error) => {
    alert(error);
});

socket.on('card query result', function (set_id, card_id, cardName, label_text) {
    //remove all cards
    $('#card-div').eq(0).remove();
    $('.edLink').remove();
    var $cardDiv = $("<div>", { id: "card-div" });
    var $edLink = undefined;
    $('#query-div').append($cardDiv);
    if (set_id == null) {
        $('#card-div').html('No Cards Matched Your Search Options');
        return false;
    }
    //if the query returns less than 6 editions of a card
    if (set_id.length <= 5) {
        for (var inc = 0; inc < set_id.length; inc++) {
            $edLink = $('<span>', { class: 'edLink btn btn-info', text: set_id[inc], data_set_id: set_id[inc], data_card_id: card_id[inc] });
            if (inc == 0) {
                var $img = $('<img>', { class: 'card-img', src: "./card_images/" + set_id[inc] + "/" + card_id[inc] + ".jpg", data_set_id: set_id[inc], data_card_id: card_id[inc], data_card_name: cardName[inc] });
                $('#card-div').append($img);
                $('#card-div').append($('<span>', { id: 'editions-label', text: label_text }));
            }
            //make a hyperlink that when clicked changes the source of the above img to data held by this link
            $('#card-div').append($edLink);
            $edLink.on('click', function (event) {
                $('#card-div > img').eq(0).attr('src', "./card_images/" + event.target.getAttribute('data_set_id') + "/" + event.target.getAttribute('data_card_id') + ".jpg");
                $('.card-img').attr('data_set_id', event.target.getAttribute('data_set_id'));
                $('.card-img').attr('data_card_id', event.target.getAttribute('data_card_id'));
            });
        }
    }
    //if the query returns more than 5 editions of a card
    else {
        for (var inc = 0; inc < set_id.length; inc++) {
            $edOption = $('<option>', { class: 'edOption', text: set_id[inc], data_set_id: set_id[inc], data_card_id: card_id[inc], data_card_name: cardName[inc] });
            if (inc == 0) {
                var $img = $('<img>', { class: 'card-img', src: "./card_images/" + set_id[inc] + "/" + card_id[inc] + ".jpg", data_set_id: set_id[inc], data_card_id: card_id[inc], data_card_name: cardName[inc] });
                $('#card-div').append($img);
                $('#card-div').append($('<span>', { id: 'editions-label', text: label_text }));
                $('#card-div').append($('<select>', { id: 'editions-sel' }));
            }
            //make an <option> that when changed to the source of the card img is determined by data attr's of this option
            $('#editions-sel').append($edOption);
        }
        $('#editions-sel').on('change', function (event) {
            var $selected = $('#editions-sel option:selected');
            $('#card-div > img').eq(0).attr('src', "./card_images/" + $selected.attr('data_set_id') + "/" + $selected.attr('data_card_id') + ".jpg");
            $('.card-img').attr('data_set_id', $selected.attr('data_set_id'));
            $('.card-img').attr('data_card_id', $selected.attr('data_card_id'));
            $('.card-img').attr('data_card_name', $selected.attr('data_card_name'));
        });
    }
    return true;
});

socket.on("robrob draft prize", () => {
    //put a btn in the dom after delete
    $('#builder-div').append(
        $('<form></form>', {
            name: 'card_back',
            id: 'card-back-form',
            enctype: "multipart/form-data"
        })
    );
    $('#card-back-form').submit((e) => { e.preventDefault(); e.stopImmediatePropagation(); upload_card_back(e.target); return false });
    $('#card-back-form')
        .append($('<label id="robrob-label">Card Back Upload:</label><br/>')
        ).append(
            $('<input/>', {
                name: 'custom_back_img',
                id: 'robrob',
                value: '220x308px',
                type: 'file',
            })
        ).append(
            $('<input/>', {
                id: 'robrob-submit',
                value: 'Submit',
                type: 'submit',
                class: 'btn btn-default',
            })
        );
});

function upload_card_back(form) {
    form = document.forms.namedItem('card_back');
    var image = new FormData(form);
    $.ajax({
        url: './builder',
        method: "POST",
        cache: false,
        contentType: false,
        processData: false,
        success: (data) => {
            alert(data);
        },
        data: image
    });
}