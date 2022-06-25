$(document).on("click", "#delete", function () {
     var myID = $(this).data('id');
     $(".modal-footer .delete").val( myID );
     console.log( $(".modal-footer .delete").attr("value"));
   });
