import { LightningElement, track, api, wire } from 'lwc';
import findContacts from '@salesforce/apex/LookupController.findContacts';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

/** The delay used when debouncing event handlers before invoking Apex. */
const DELAY = 300;
const debugmode = false;

export default class Lookup extends LightningElement {

    // attributes
    @api objectname;
    @api keyfieldapiname;
    @api autoselectsinglematchingrecord = false;
    @api lookupLabel;
    @api lookupPlaceholder;
    @api invalidOptionChosenMessage;

    // reactive private properties
    @track searchKey = '';
    @track contacts;
    @track error;
    @track selectedContactId;
    @track disabledInput;
    @track placeholderLabel = "Search";
    @track searchLabel;
    @track themeInfo;

    @wire(getObjectInfo, { objectApiName: "$objectname" })
    handleResult({error, data}) {
        if(data) {


            let objectInformation = data;
            // console.log("objectInformation", JSON.stringify(objectInformation));

            if(this.lookupPlaceholder) {
                this.placeholderLabel = this.lookupPlaceholder;
            } else {
                this.placeholderLabel += " " + (objectInformation && objectInformation.labelPlural ?
                    objectInformation.labelPlural : '');
            }
            this.searchLabel = this.lookupLabel || objectInformation.label;
            this.themeInfo = objectInformation.themeInfo || {};
            this.debug("Labels retrieved..");

            this.validateAttributes(objectInformation);
        }
        if(error) {
            this.showError("You do not have the rights to object or object api name is invalid: " + this.objectname);
            this.disabledInput = true;
            // console.log("error", JSON.stringify(error));
        }
    }

    validateAttributes(objectInformation) {
        let fields = objectInformation.fields;

        let fieldName, nameField;
        let keyfieldapiname = this.keyfieldapiname;
        Object.keys(fields).forEach(function(key, index) {
            let field = fields[key];
            if(keyfieldapiname && key && keyfieldapiname.toLowerCase() === key.toLowerCase()) {
                fieldName = key;
            }
            if(field.nameField) {
                nameField = key;
            }
        });
        if(fieldName && fieldName !== this.keyfieldapiname) {
            this.keyfieldapiname = fieldName;
        }
        if(!fieldName && nameField) {
            this.disabledInput = true;
            this.showError("Invalid field api name is passed - " + this.keyfieldapiname);
        }
    }

    handleKeyChange(event) {
        this.setContactId("");
        // Debouncing this method: Do not update the reactive property as long as this function is
        // being called within a delay of DELAY. This is to avoid a very large number of Apex method calls.
        window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        this.delayTimeout = setTimeout(() => {
            this.searchKey = searchKey;
            this.queryRecords();
        }, DELAY);
    }

    handleBlur(event) {
        this.debug("before event.target.value", event.target.value, this.selectedContactId);

        // copy the reference of properties locally to make them available for timeout
        let searchKey = event.target.value;
        let selectedContactId = this.selectedContactId;
        let contacts = this.contacts;
        // timeout is added to avoid showing error when user selects a result
        setTimeout(() => {
            if(this.searchKey) {
                // when single records is available, select it
                if(this.autoselectsinglematchingrecord && this.contacts && this.contacts.length === 1) {
                    this.setContactId(contacts[0].Id);
                    this.searchKey = contacts[0].Name;
                    this.contacts = [];
                }
                // clear out contacts when user types a keyword, does not select any record and clicks away
                if(!this.selectedContactId && this.searchKey) {
                    this.contacts = [];
                }
                this.debug("inside blur timeout", this.searchKey, this.selectedContactId);
                this.toggleError();
            }
        }, 200);
    }

    queryRecords() {
        this.debug("you typed: " + this.searchKey);
        findContacts({ "searchKey": this.searchKey,
            "objectApiName": this.objectname,
            "keyField": this.keyfieldapiname} )
            .then(result => {
                let keyfieldapiname = this.keyfieldapiname;
                this.debug("this.keyfieldapiname", keyfieldapiname);
                let contacts = [];
                result.forEach(function(eachResult) {
                    contacts.push({ "Id": eachResult.Id, "Name": eachResult[keyfieldapiname] });
                });
                this.contacts = contacts;
                this.debug("this.contacts", JSON.stringify(this.contacts));

                this.toggleError();
            })
            .catch(error => {
                this.error = error;
            });
    }

    toggleError() {
        let message = !this.selectedContactId && this.searchKey && (this.contacts && this.contacts.length === 0) ?
        (this.invalidOptionChosenMessage || "An invalid option has been chosen.") : "";
        this.showError(message);
    }

    showError(message) {
        let searchInput = this.template.querySelector(".searchInput");
        searchInput.setCustomValidity(message);
        searchInput.reportValidity();
    }

    onResultClick(event) {
        this.setContactId(event.currentTarget.dataset.contactId);
        this.searchKey = event.target.innerText;
        this.debug("selectedContactId", this.selectedContactId);
        this.contacts = [];
        this.template.querySelector(".searchInput").focus();
    }

    setContactId(contactId) {
        if(this.selectedContactId !== contactId) {
            this.selectedContactId = contactId;

            let contact = {};
            if(this.contacts) {
                contact = this.contacts.find(c => c.Id === contactId) || {};
            }
            const searchKeyword = this.selectedContactId ? contact.Name : "";
            const eventData = {"detail": { "contact": contact, "searchKey": searchKeyword }};
            const selectedEvent = new CustomEvent('selected', eventData);
            this.debug("sending event", JSON.stringify(eventData));
            this.dispatchEvent(selectedEvent);
        }
    }

    get comboBoxClass() {
        let className = (this.contacts && this.contacts.length ? "slds-is-open" : "");
        return "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click " + className;
    }

    get iconColor() {
        let color = "background-color: " +
            (this.themeInfo && this.themeInfo.color ?
                ("#" + this.themeInfo.color) : "") +
            ";";
        this.debug("color", color);
        return color;
    }

    get noRecordFound() {
        return this.searchKey && (this.contacts && this.contacts.length === 0);
    }

    get showMessage() {
        return this.selectedContactId && this.searchKey;
    }

    debug(message) {
        if(this.debugmode === true) {
            console.log(message);
        }
    }
}