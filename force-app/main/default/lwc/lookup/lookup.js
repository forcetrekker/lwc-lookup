import { LightningElement, track, api, wire } from 'lwc';
import findContacts from '@salesforce/apex/LookupController.findContacts';

/** The delay used when debouncing event handlers before invoking Apex. */
const DELAY = 300;
const DEBUG_MODE = false; // true;

export default class Lookup extends LightningElement {

    @track searchKey = '';

    @track contacts;
    @track error;
    @track selectedContactId;

    handleKeyChange(event) {
        this.selectedContactId ="";
        // Debouncing this method: Do not update the reactive property as long as this function is
        // being called within a delay of DELAY. This is to avoid a very large number of Apex method calls.
        window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        this.delayTimeout = setTimeout(() => {
            this.searchKey = searchKey;
            this.handleLoad();
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
                if(this.contacts && this.contacts.length === 1) {
                    this.selectedContactId = contacts[0].Id;
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

    handleLoad() {
        this.debug("you typed: " + this.searchKey);
        findContacts({ "searchKey": this.searchKey} )
            .then(result => {
                this.contacts = result;
                this.toggleError();
            })
            .catch(error => {
                this.error = error;
            });
    }

    toggleError() {
        let searchInput = this.template.querySelector(".searchInput");
        let message = !this.selectedContactId && this.searchKey && (this.contacts && this.contacts.length === 0) ?
            "No matching records found!" : "";
        searchInput.setCustomValidity(message);
        searchInput.reportValidity();
    }

    onResultClick(event) {
        this.selectedContactId = event.currentTarget.dataset.contactId;
        this.searchKey = event.target.innerText;
        this.debug("selectedContactId", this.selectedContactId);
        this.contacts = [];
    }

    get comboBoxClass() {
        let className = (this.contacts && this.contacts.length ? "slds-is-open" : "");
        return "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click " + className;
    }

    get noRecordFound() {
        return this.searchKey && (this.contacts && this.contacts.length === 0);
    }

    get showMessage() {
        return this.selectedContactId && this.searchKey;
    }

    debug(message) {
        if(DEBUG_MODE) {
            console.log(message);
        }
    }
}