//setting required libraries
const express = require("express")
const cors = require("cors")
const addressCheckerRouter = require("./routes/addressRoutes")
const ipAnalysisRouter = require("./routes/ipAnalysis");
const credentialCheckerRouter = require("./routes/credentialRoutes")
const chartGenerator = require('./routes/chartRoutes')
const swaggerUI = require("swagger-ui-express")
const swaggerJsDoc = require("swagger-jsdoc")
const swaggerFile = require("./CTI-IPswagger.json")

//port setting
const PORT = process.env.PORT || 4000

//swagger file definitions
const specs = swaggerJsDoc(swaggerFile)


// app definition
const app = express()
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs))
app.use(cors())
app.use(express.json())


app.use('/imgs', express.static('imgs'));

// apply address checking routes
app.use("/", addressCheckerRouter)
// apply IP analysis routes
app.use("/", ipAnalysisRouter)
// apply credential checking routes
app.use("/", credentialCheckerRouter)
// Chart path
app.use('/', chartGenerator);

// listening to port 
app.listen(PORT, () => console.log("Server running on port " + PORT))