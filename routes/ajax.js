var express = require('express');
var router = express.Router();
var postgresQueriesModule = require('../postgres/queries');

/* Ajax calls routing */
router.get('/search', async function(req, res, next){
  var result = await postgresQueriesModule.search_in_radius_query(req.query);
  res.send(result);
});

router.get('/route', async function(req, res, next){
  var result = await postgresQueriesModule.route_query(req.query);
  res.send(result);
})

module.exports = router;
