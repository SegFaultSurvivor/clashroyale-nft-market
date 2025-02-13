import React, { useEffect, useState } from "react";
import logo from "../logo.png";
import { Actor, HttpAgent } from "@dfinity/agent"
import { idlFactory } from "../../../declarations/NFT";
import { idlFactory as tokenidlFactory } from "../../../declarations/token_backend";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import { opend_backend } from "../../../declarations/opend_backend";
import CURRENT_USER_ID from "../main";
import PriceLabel from "./PriceLabel";

function Item(props) {

  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderHidden, setLoaderHidden] = useState(true);
  const [blurObject, setBlurObject] = useState();
  const [sellStatus, setSellStatus] = useState("");
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);

  const id = props.id;

  const localHost = "http://localhost:3000/";
  const agent = new HttpAgent({ host: localHost });
  agent.fetchRootKey();
  let NFTActor;

  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id
    });

    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(new Blob([imageContent.buffer], { type: "image/png" }));

    setName(name);
    setOwner(owner.toText());
    setImage(image);

    if (props.role == "collection") {
      const nftIsListed = await opend_backend.isListed(props.id);
      if (nftIsListed) {
        setOwner("OpenD");
        setBlurObject({ filter: "blur(4px)" });
        setSellStatus("Listed");
      }
      else {
        setButton(<Button handleCLick={handleSell} text={"Sell"} />);
      }
    }
    else if (props.role == "discover"){
      const originalOwner = await opend_backend.getOriginalOwner(props.id);
      if(originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleCLick={handleBuy} text={"Buy"} />);
      }

      const price = await opend_backend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
    }
  }

  useEffect(() => {
    loadNFT();
  }, []);

  let price;
  function handleSell() {
    setPriceInput(<input
      placeholder="Price in Initium"
      type="number"
      className="price-input"
      value={price}
      onChange={(e) => price = e.target.value}
    />);
    setButton(<Button handleCLick={sellItem} text={"Confirm"} />);
  }

  async function sellItem() {
    setBlurObject({ filter: "blur(4px)" });
    setLoaderHidden(false);
    const listingResult = await opend_backend.listItem(props.id, Number(price));
    console.log(listingResult);
    if (listingResult == "Success") {
      const openDId = await opend_backend.getOpenDCanisterID();
      const transferResut = await NFTActor.transferOwnership(openDId);
      console.log(transferResut);
      if (transferResut == "Success") {
        setLoaderHidden(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
        setSellStatus("Listed");
      }
    }
  }

  async function handleBuy() {
    console.log("working");
    setLoaderHidden(false);
    const tokenActor = await Actor.createActor(tokenidlFactory, {
      agent,
      canisterId: Principal.fromText("avqkn-guaaa-aaaaa-qaaea-cai"),
    });

    const sellerId = await opend_backend.getOriginalOwner(props.id);
    const itemPrice = await opend_backend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    if (result == "Success") {
      const transferResult = await opend_backend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
      console.log(transferResult);
      setLoaderHidden(true);
      setDisplay(false);
    }

  }

  return (
    <div style={{ display: shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blurObject}
        />
        <div hidden={loaderHidden} className="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}
            <span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
