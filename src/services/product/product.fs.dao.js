import fs from "fs";
import { myProducts } from "../../mocks/index.js";
import config from "../../config.js";
import { generateRandomId } from "../utils.js";
import { errorDictionary } from "../../config.js";
import CustomError from "../custom.error.class.js";

// Clase para controlar los métodos referentes a los productos.
class ProductFSClass {
  constructor() {
    this.productsArray = [];
    this.path = `${config.DIRNAME}/jsons/product.json`;
    this.getting = false;
  };
  getPaginatedProducts = async (limit = 10, page = 1, query, sort, available, where) => {
    try {

      const lecture = await this.readFileAndSave();
      
      if (!(limit || page || query || sort || available)) return this.productsArray;
      
      let matrixProducts = [];
      let j = 0;
      matrixProducts.push([]);
  
      query
        ? (this.productsArray = this.productsArray.filter(
            (product) => product.category == query
          ))
        : this.productsArray;
  
      available == "true"
        ? (this.productsArray = this.productsArray.filter(
            (product) => product.stock > 0
          ))
        : available == "false"
        ? (this.productsArray = this.productsArray.filter(
            (product) => product.stock == 0
          ))
        : this.productsArray;
  
      sort == 1
        ? this.productsArray.sort((a, b) => a.price - b.price)
        : sort == -1
        ? this.productsArray.sort((a, b) => b.price - a.price)
        : this.productsArray;
  
      for (let i = 0; i < this.productsArray.length; i++) {
        if (i == 0 || !(i % limit == 0)) {
          matrixProducts[j].push(this.productsArray[i]);
        } else {
          matrixProducts.push([]);
          j++;
          matrixProducts[j].push(this.productsArray[i]);
        }
      }
      let pageProducts = matrixProducts[page - 1];
      let totalPages = matrixProducts.length;
      let prevPage = page == 1 ? undefined : page - 1;
      let nextPage = !matrixProducts[page] ? undefined : page + 1;
      let prevUrl;
      let nextUrl;
  
      if (query) {
        prevPage
          ? (prevUrl = `${where}?query=${query}&page=${prevPage}&limit=${limit}&sort=${sort}&available=${available}`)
          : null;
        nextPage
          ? (nextUrl = `${where}?query=${query}&page=${nextPage}&limit=${limit}&sort=${sort}&available=${available}`)
          : null;
      } else {
        prevPage
          ? (prevUrl = `${where}?page=${prevPage}&limit=${limit}&sort=${sort}&available=${available}`)
          : null;
        nextPage
          ? (nextUrl = `${where}?page=${nextPage}&limit=${limit}&sort=${sort}&available=${available}`)
          : null;
      }
      this.getting = false;
      
      const paginateProductsFormat = pageProducts.map( product => {
        product = { _doc: product, _id: product._id }
        return product;
      });
      
      const toSendObject = {
        status: "success",
        payload: { docs: paginateProductsFormat, prevPage: prevPage, page: page, totalPages: totalPages, nextPage: nextPage },
        prevLink: prevUrl,
        nextLink: nextUrl,
      };
    
      return toSendObject;
      
    } catch (error) {
      return undefined;
    }
  };
  addProducts = async (...products) => {
    try {
      await this.readFileAndSave();
      let newProducts = [];

      for (let i = 0; i <= products.length; i++) {
        let product = products[i];
        let myId = generateRandomId();
        while (this.productsArray.some((product) => product._id == myId)) {
          myId = generateRandomId();
        }
        let newProduct = {
          title: product.title,
          description: product.description,
          price: product.price,
          code: product.code,
          stock: product.stock,
          category: product.category,
          status: product.status,
          thumbnail: product.thumbnail,
          owner: product.owner || "admin",
          _id: myId,
        };
        if (Object.keys(newProduct).includes(undefined) || Object.values(newProduct).includes(undefined)) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `Campos del nuevo producto`);
        const FSProduct = await this.productsArray.find(
          (product) => product == newProduct
        );
        if (FSProduct) throw new CustomError(errorDictionary.ADD_DATA_ERROR, `Alguno de los productos ya existe`);

        newProducts.push(newProduct);
      }
      this.productsArray.push(...newProducts);
      await this.updateFile(this.productsArray);
      return this.productsArray;
    } catch (error) {
      return undefined;
    }
  };
  getProductById = async (id) => {
    try {
      this.getting = true;
      await this.readFileAndSave();
      let gottenProduct = await this.productsArray.find((product) => product._id == id);
      if (!gottenProduct) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Producto");
      this.getting = false;
      return gottenProduct;
    } catch (error) {
      return undefined;
    }
  };
  updateProductById = async (pid, latestProduct = {}) => {
    try {
      await this.readFileAndSave();
      const oldProduct = await this.productsArray.find((product) => product._id == pid);
      if (!oldProduct) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Producto a ser actualizado`);
      let testProduct = {
        title: latestProduct.title,
        description: latestProduct.description,
        price: latestProduct.price,
        code: latestProduct.code,
        stock: latestProduct.stock,
        category: latestProduct.category,
        status: latestProduct.status,
        thumbnail: latestProduct.thumbnail,
      };
      for (let i = 0; i <= 7; i++) {
        if (
          Object.values(testProduct)[i] !== 0 &&
          (Object.values(testProduct)[i] == "" ||
          Object.values(testProduct)[i] == undefined)
        ) {
          let oldValue = Object.values(oldProduct)[i + 1];
          let myProp = Object.keys(testProduct)[i];
          testProduct = { ...testProduct, [myProp]: oldValue };
        }
      }
      testProduct = { ...testProduct, _id: generateRandomId() };
      let oldIndex = this.productsArray.indexOf(oldProduct);
      this.productsArray.splice(oldIndex, 1, testProduct);
      await this.updateFile(this.productsArray);
      let updatedProduct = await this.productsArray.find(
        (product) => product._id == testProduct._id
      );
      return updatedProduct;
    } catch (error) {
      return undefined;
    }
  };
  deleteProductById = async (pid) => {
    try {
      await this.readFileAndSave();
      let toDeleteProduct = await this.productsArray.find(
        (product) => product._id == pid
      );
      if (!toDeleteProduct) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Producto a eliminar`);
      const forDeleteIndex = this.productsArray.indexOf(toDeleteProduct);
      this.productsArray.splice(forDeleteIndex, 1);
      await this.updateFile(this.productsArray);
      return `Producto de ID '${pid}' eliminado.`;
    } catch (error) {
      return undefined;
    }
  };
  updateFile = async (array) => {
    try {
      fs.writeFileSync(`${this.path}`, JSON.stringify(array), () => {});
    } catch (error) {
      throw new CustomError(error.type, `[Service::FS]: ${error.message}`);
    }
  };
  readFileAndSave = async () => {
    try {
      if (fs.existsSync(this.path)) {
        let fileContent = fs.readFileSync(this.path, "utf-8") || null;
        let parsedFileContent = JSON.parse(fileContent) || null;
        this.productsArray = parsedFileContent || [];
      } else {
        this.updateFile(this.productsArray);
      }
      return this.productsArray;
    } catch (error) {
      throw new CustomError(error.type, `[Service::FS]: ${error.message}`);
    };
  };
  getAllProducts = async () => {
    try {
      const lecture = await this.readFileAndSave();
      if (!lecture) throw CustomError(errorDictionary.GENERAL_FOUND_ERROR);
      return this.productsArray;
    } catch (error) {
      return undefined;
    }
  }
};

// Productos de ejemplo para agregar y probar el algoritmo.
const [product1, product2, product3, productCambiado] = myProducts;

// Métodos a utilizar:

// Para productos:
// exampleProductManager.addProduct();
// exampleProductManager.getProducts();
// exampleProductManager.getProductById();
// exampleProductManager.deleteProductById();
// exampleProductManager.updateProduct();
// exampleProductManager.readFileAndSave();

const ProductFSService = new ProductFSClass();

export default ProductFSService;
