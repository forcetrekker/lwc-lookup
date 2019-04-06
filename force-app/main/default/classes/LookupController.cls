public with sharing class LookupController {

    @AuraEnabled(cacheable=true)
    public static List<Contact> findContacts(String searchKey) {
        System.debug('searchKey: ' + searchKey);
        List<Contact> contacts =  new List<Contact>();
        if(String.isEmpty(searchKey)) {
            return contacts;
        }
        String key = '%' + searchKey + '%';
        contacts = [SELECT Id, Name, Title, Phone, Email FROM Contact WHERE Name LIKE :key ORDER BY Name LIMIT 10];
        System.debug('contacts: ' + contacts);
        return contacts;
    }
}