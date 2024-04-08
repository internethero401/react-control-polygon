import React, { useState, useEffect, useRef } from 'react';
// import { fabric } from 'fabric';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);  // 表示する画像fileを保管
  const [mode, setMode] = useState(true);  // true: 点追加モード, false: 点の編集モード
  const [points, setPoints] = useState([]);
  const [currentPoint, setCurrentPoint] = useState({ x: null, y: null })
  const [isMoving, setIsMoving] = useState(false);  // false: どの点を編集するか選ぶ, true: 点を編集する
  // const [editPoint, setEditPoint] = useState({ x: null, y: null });  // 動かし始めの地点
  const [keepIdx, setKeepIdx] = useState(null)
  const canvasRef = useRef(null);

  // modeの変更
  const changeMode = () => {
    setMode(!mode);  
    setCurrentPoint({ x: null, y: null })  // バグ治し
    setIsMoving(false)  // バグ治し
  };

  const allDelete = () => {
    setMode(true)
    setPoints([])
    setCurrentPoint({ x: null, y: null})
    setIsMoving(false)
    setKeepIdx(null)
  }

  // canvasの背景画像を動的に更新
  const handleFileChange = (event) => {
    const file = event.target.files[0]; // file選択
    if (file) {
      // FileReaderを使用して画像を読み込む
      const reader = new FileReader();
      reader.onload = function(e) {
        // Canvasのスタイルとして新しい画像を設定
        const canvas = canvasRef.current;
        if (canvas) {
          // CSSのbackgroundImageプロパティを使用して画像を設定
          canvas.style.backgroundImage = `url('${e.target.result}')`;
          canvas.style.backgroundSize = 'cover'; // 背景画像がCanvasを完全に覆うように設定
          canvas.style.backgroundPosition = 'center'; // 背景画像が中央に配置されるように設定
        }
        setSelectedImage(e.target.result); // この行は選択した画像データを状態に保存するために必要かもしれませんが、CSS背景としては不要です
      };
      reader.readAsDataURL(file);
    }
    setCurrentPoint({ x: null, y: null });
    setPoints([]);
  };

  // 押した場所をcueerentPointにupdateする
  const handleClick = (event) => {
    if (selectedImage !== null) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setCurrentPoint({ x, y });
    }
  };

  // 点を延長線に対して垂直に下した交点が線の上にあるかを判定する(useEffectの中で使う)
  const judgExist = (point1, point2, currentPoint) => {
    let a = (point2.y - point1.y) / (point2.x - point1.x);  // 傾き
    let c = point1.y - a * point1.x;  // 切片
    let d = -1 / a  // 垂線の傾き
    let e = currentPoint.y - d * currentPoint.x  // 垂線の切片
    // y=ax+cとy=dx+eを連立して解く
    let f = (e - c) / (a - d)  // 垂線を下した交点のx座標
    let g = a * f + c  // 垂線を下した交点のy座標
    // 交点がpoints[i]とpoints[j]の間にあるか
    if (((point1.x <= f && f <= point2.x) || (point2.x <= f && f <= point1.x)) &&
      ((point1.y <= g && g <= point2.y) || (point2.y <= g && g <= point1.y))) {
        // ☆☆☆deDistanceの値の調整必要☆☆☆
      return { deDistance: 150, a, c };  // ある時は距離を少しマイナス
    } else {
      return { deDistance: 0, a, c };  // ない時は距離はそのまま
    }
  }


  // ☆useEffectt1 描画
  useEffect(() => {
    if (selectedImage !== null) {
      // canvasの初期設定
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);  // ペンを最初の位置に持っていく
        // 線描画
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i <= points.length; i++) {  // ここから5行は足りないpoints[0]からpoints[-1]を繋ぐため
          let j = i;
          if (i === points.length) {
            j = 0;
          }
          ctx.lineTo(points[j].x, points[j].y);
          ctx.strokeStyle = 'white'; 
        }
        ctx.stroke();  

        // 点描画
        points.forEach((point, index) => {
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);  // 点を描画
          // 編集中の点だけ青色に設定
          if(isMoving === true){
            if(index === keepIdx){
              ctx.strokeStyle = 'red'; 
            } else {
              ctx.strokeStyle = 'white'; 
            }
          }
          ctx.stroke();
        });
      }
    }
  }, [selectedImage, points, currentPoint, isMoving, keepIdx]);


  // ☆useEffectt2 mode:trueの時
  useEffect(() => {
    if (selectedImage !== null) {
      console.log(points)
      // currentPointがpoints配列にすでに存在するかチェック
      const pointExists = points.some(point => point.x === currentPoint.x && point.y === currentPoint.y);
      // currnentPointがpoints配列に無かったら
      if (mode === true){
        if (!pointExists) {
          // currentPointが有効な時だけ(nullじゃなかったら)
          if (currentPoint.x != null && currentPoint.y != null) {
            // points配列が0か1なら配列の最後に追加
            if (points.length < 2) {
              setPoints([...points, currentPoint]);
              // ☆points配列が2以上なら追加する適正な場所を探し入れる
            } else {
              let minBetweenLength = Infinity;
              let minBetweenLengthIdx = 0;
              for (let i = 0; i < points.length; i++) {  // ここから5行はpoints[0]からpoints[-1]の線を認識するため. ループ回数◎
                let j = i + 1
                if (j === points.length) {
                  j = 0
                }
                let result = judgExist(points[i], points[j], currentPoint);
                let b = -1
                let distance = Math.abs(result.a * currentPoint.x + b * currentPoint.y + result.c) / Math.sqrt(result.a * result.a + b * b) - result.deDistance;  // 線と直線の方程式 - 関数の結果77       
                if (distance < minBetweenLength) {
                  minBetweenLength = distance;
                  minBetweenLengthIdx = i;
                }
              }
              const newPoints = [...points];  // 一度新しい変数newPointsを作ってpointsの内容をコピー
              newPoints.splice(minBetweenLengthIdx + 1, 0, currentPoint);  // 挿入
              setPoints(newPoints);
            }
          }
        }
      }
    }
  }, [selectedImage, mode, points, currentPoint]);


  // ☆useEffectt3 mode:falseの時
  useEffect(() => {
    if(mode === false){
      if(points.length > 0){
        const allowableError = 8   // ☆☆☆値の調整必要☆☆☆
        // どの点を編集したいか選ぶ
        if(isMoving === false){
          if(currentPoint.x !== null && currentPoint.y !== null){
            let i = 0
            while(i < points.length){
              if(points[i].x-allowableError <= currentPoint.x && currentPoint.x <= points[i].x+allowableError &&
                points[i].y-allowableError <= currentPoint.y && currentPoint.y <= points[i].y+allowableError){
                console.log("編集開始")
                // setEditPoint({ x:points[i].x , y:points[i].y})
                setIsMoving(true)  // 点を見つけれたら次は点を動かすmodeに
                setKeepIdx(i)
                break;
              } 
              i += 1;
              // 押した所が点と認識できなかった時
              if(i === points.length ){
                setCurrentPoint({ x: null, y: null })
                console.log("編集する頂点が見つけれません")
                break;
              }
            }
          }
        // 実際に点を編集する
        } else {
          // currnetPointの値が更新された = ドロップした
          if((points[keepIdx].x-allowableError >= currentPoint.x || currentPoint.x >= points[keepIdx].x+allowableError) &&
             (points[keepIdx].y-allowableError >= currentPoint.y || currentPoint.y >= points[keepIdx].y+allowableError)){
            points[keepIdx] = currentPoint
            console.log("編集終了")
            setIsMoving(false)  //  どの点を編集するか決めるmodeに戻す
            setCurrentPoint({ x: null, y: null })
            setKeepIdx(null)
          }
        }
      } else {
        console.log("編集できません")
      }
    }
  },[mode, points, currentPoint, isMoving, keepIdx])


  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {selectedImage !== null && (
        <div tyle={{ display: "flex"}}>
          <button id="myButton1" onClick={changeMode}> {mode ? "Add Points" : "Edit Points"} </button>
          <button id="myButton2" onClick={allDelete}> All Delete </button>
        </div>
      )}
      <canvas ref={canvasRef} width="600" height="400" style={{ outline: "1px solid #000" }} onClick={handleClick}></canvas>
      <input type="file"   onChange={handleFileChange} accept="image/*"/>
    </div>
  );
}
export default App;

/*
 課題↓
 1. All Deleteで画像も消せるようにしたい
 2. 画像をcanvasに適合させる
*/