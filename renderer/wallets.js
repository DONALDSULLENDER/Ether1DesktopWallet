const {ipcRenderer} = require('electron');

class Wallets {
  constructor() {
    this.addressList = []; 

    $.getJSON("https://min-api.cryptocompare.com/data/price?fsym=ETHO&tsyms=USD", function( price ) 
    {
      EthoWallets._setPrice(price.USD);
    });         
  }

  _getPrice() {
    return this.price;
  }

  _setPrice(price) {
    this.price = price;
  }

  getAddressList() {
    return this.addressList;
  }

  clearAddressList() {
    this.addressList = []; 
  }

  getAddressExists(address) {
    if (address) {
      return this.addressList.indexOf(address.toLowerCase()) > -1;
    } else {
      return false;
    }
  }

  addAddressToList(address) {
    if (address) {
      this.addressList.push(address.toLowerCase());
    }
  }

  enableButtonTooltips() {
    EthoUtils.createToolTip("#btnNewAddress", "Create New Address");
    EthoUtils.createToolTip("#btnExportAccounts", "Export Accounts");
    EthoUtils.createToolTip("#btnImportAccounts", "Import Accounts");
  }
    
  validateNewAccountForm() {
    if (EthoMainGUI.getAppState() == "account") {
        if (!$("#walletPasswordFirst").val()) {
            EthoMainGUI.showGeneralError("Password cannot be empty!");  
            return false;
        }
        
        if (!$("#walletPasswordSecond").val()) {
          EthoMainGUI.showGeneralError("Password cannot be empty!");  
          return false;
        }

        if ($("#walletPasswordFirst").val() !== $("#walletPasswordSecond").val()) {
            EthoMainGUI.showGeneralError("Passwords do not match!");  
            return false;
        }

        return true;
    } else {
        return false;
    }
}

renderWalletsState() {
    // clear the list of addresses
    EthoWallets.clearAddressList();

    EthoBlockchain.getAccountsData(
      function(error) {
        EthoMainGUI.showGeneralError(error);
      },
      function(data) {
        data.addressData.forEach(element => {
          EthoWallets.addAddressToList(element.address);
        });

        // render the wallets current state
        EthoMainGUI.renderTemplate("wallets.html", data);          
        $(document).trigger("render_wallets");
        EthoWallets.enableButtonTooltips();

        $("#labelSumDollars").html(vsprintf("/ %.2f $ / %.4f $ per ETHO", [data.sumBalance * EthoWallets._getPrice(), EthoWallets._getPrice()]));
      }
    );
  }
}

// the event to tell us that the wallets are rendered
$(document).on("render_wallets", function() {
  $('#addressTable').floatThead();

  $("#btnNewAddress").off('click').on('click', function() {
    $("#dlgCreateWalletPassword").iziModal();
    $("#walletPasswordFirst").val("");
    $("#walletPasswordSecond").val("");
    $('#dlgCreateWalletPassword').iziModal('open');

    function doCreateNewWallet() {
      $('#dlgCreateWalletPassword').iziModal('close');

      if (EthoWallets.validateNewAccountForm()) {
        EthoBlockchain.createNewAccount($("#walletPasswordFirst").val(),
          function(error) {
            EthoMainGUI.showGeneralError(error);
          },
          function(account) {      
            EthoWallets.addAddressToList(account);
            EthoWallets.renderWalletsState();

            iziToast.success({
              title: 'Created',
              message: 'New wallet was successfully created',
              position: 'topRight',
              timeout: 5000
            });                                         
          }
        );
      }      
    }

    $("#btnCreateWalletConfirm").off('click').on('click', function() {
      doCreateNewWallet();
    });

    $("#dlgCreateWalletPassword").off('keypress').on('keypress', function(e) {
      if(e.which == 13) {
        doCreateNewWallet();
      }
    });                                
  });                

  $(".btnShowAddressTransactions").off('click').on('click', function() {
    EthoTransactions.setFilter($(this).attr('data-wallet'));
    EthoMainGUI.changeAppState("transactions");
    EthoTransactions.renderTransactions();
  });

  $(".btnChangWalletName").off('click').on('click', function() {
    var walletAddress = $(this).attr('data-wallet');
    var walletName = $(this).attr('data-name');

    $("#dlgChangeWalletName").iziModal();
    $("#inputWalletName").val(walletName);
    $('#dlgChangeWalletName').iziModal('open');

    function doChangeWalletName() {
      var wallets = EthoDatatabse.getWallets();

      // set the wallet name from the dialog box
      wallets.names[walletAddress] = $("#inputWalletName").val();
      EthoDatatabse.setWallets(wallets);

      $('#dlgChangeWalletName').iziModal('close');
      EthoWallets.renderWalletsState();
    }

    $("#btnChangeWalletNameConfirm").off('click').on('click', function() {
      doChangeWalletName();
    });

    $("#dlgChangeWalletName").off('keypress').on('keypress', function(e) {
      if(e.which == 13) {
        doChangeWalletName();
      }
    });                                
  });                

  $("#btnExportAccounts").off('click').on('click', function() {
    ipcRenderer.send('exportAccounts', {});
  });

  $("#btnImportAccounts").off('click').on('click', function() {
    ipcRenderer.sendSync('importAccounts', {});
  });

  $(".textAddress").off('click').on('click', function() {
    EthoMainGUI.copyToClipboard($(this).html());

    iziToast.success({
      title: 'Copied',
      message: 'Address was copied to clipboard',
      position: 'topRight',
      timeout: 2000
    }); 
  });
});

// event that tells us that geth is ready and up
$(document).on("onGethReady", function() {
  EthoMainGUI.changeAppState("account");
  EthoWallets.renderWalletsState();
});

$(document).on("onNewAccountTransaction", function() {
  if (EthoMainGUI.getAppState() == "account") {
    EthoWallets.renderWalletsState();      
  }
});
  
EthoWallets = new Wallets();