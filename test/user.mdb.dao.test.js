import Assert from "assert";
import mongoose from "mongoose";
import UserMDBService from "../src/services/user/user.mdb.dao.js";
import config from "../src/config.js";

const connection = mongoose.connect(config.MONGO_URI);
const assert = Assert.strict;
const testUser = { first_name: "Jerry", last_name: "Smith", password: "Coki2011", email: "jerrysmith@gmail.com" };


describe("Test DAO-MDB Service", function() {
    before(function() {});
    beforeEach(function() {});
    after(function() {});
    afterEach(function() {});
    it("getAllUsers() | Debe retornar un array de usuarios", async function() {
        const result = UserMDBService.getAllUsers();
        assert.strictEqual(Array.isArray(result), true);
    });
})
